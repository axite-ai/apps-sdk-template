/**
 * Webhook Service
 *
 * Handles Plaid webhooks for token expiration, item errors, and other events.
 * Provides webhook verification and event processing.
 */

import crypto from 'crypto';
import { db } from '@/lib/db';
import { plaidWebhooks, plaidItems } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logger, LoggerService, AuditEventType } from './logger-service';
import { UserService } from './user-service';
import { syncTransactionsForItem } from './plaid-service';

/**
 * Plaid webhook payload structure
 */
export interface PlaidWebhook {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: {
    error_code: string;
    error_message: string;
    error_type: string;
    display_message?: string;
  };
  new_transactions?: number;
  removed_transactions?: string[];
  [key: string]: unknown;
}

export interface WebhookRecord {
  id: string;
  itemId: string | null;
  userId: string | null;
  webhookType: string;
  webhookCode: string;
  errorCode: string | null;
  payload: unknown;
  processed: boolean;
  receivedAt: Date;
  processedAt: Date | null;
  createdAt: Date;
}

/**
 * Webhook Service for handling Plaid events
 */
export class WebhookService {
  /**
   * Verify webhook signature from Plaid
   *
   * @param body - Raw request body
   * @param signature - Plaid-Verification header
   * @returns true if signature is valid
   */
  public static verifyWebhookSignature(body: string, signature: string): boolean {
    // Plaid uses JWT for webhook verification
    // For production, implement full JWT verification
    // For now, we'll implement a simple HMAC verification if PLAID_WEBHOOK_SECRET is set

    const webhookSecret = process.env.PLAID_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.warn('[Webhook] PLAID_WEBHOOK_SECRET not set, skipping verification');
      return true; // Allow in development
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('[Webhook] Signature verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Store webhook in database for audit and processing
   */
  public static async storeWebhook(webhook: PlaidWebhook, userId?: string): Promise<string> {
    const [result] = await db
      .insert(plaidWebhooks)
      .values({
        webhookType: webhook.webhook_type,
        webhookCode: webhook.webhook_code,
        itemId: webhook.item_id,
        errorCode: webhook.error?.error_code || null,
        payload: webhook as any,
        userId: userId || null,
      })
      .returning({ id: plaidWebhooks.id });

    const webhookId = result.id;

    // Log to audit trail
    await LoggerService.logWebhook(
      webhook.webhook_type,
      webhook.webhook_code,
      webhook.item_id,
      userId
    );

    return webhookId;
  }

  /**
   * Mark webhook as processed
   */
  public static async markWebhookProcessed(webhookId: string): Promise<void> {
    await db
      .update(plaidWebhooks)
      .set({
        processed: true,
        processedAt: new Date(),
      })
      .where(eq(plaidWebhooks.id, webhookId));
  }

  /**
   * Process a Plaid webhook event
   */
  public static async processWebhook(webhook: PlaidWebhook): Promise<void> {
    logger.info('[Webhook] Processing webhook', {
      type: webhook.webhook_type,
      code: webhook.webhook_code,
      itemId: webhook.item_id,
    });

    // Find the user who owns this item
    const userId = await this.findUserByItemId(webhook.item_id);

    // Store webhook
    const webhookId = await this.storeWebhook(webhook, userId);

    try {
      // Route to appropriate handler based on webhook type
      switch (webhook.webhook_type) {
        case 'ITEM':
          await this.handleItemWebhook(webhook, userId);
          break;

        case 'TRANSACTIONS':
          await this.handleTransactionsWebhook(webhook, userId);
          break;

        case 'AUTH':
          await this.handleAuthWebhook(webhook, userId);
          break;

        case 'ASSETS':
        case 'INCOME':
        case 'LIABILITIES':
          logger.info(`[Webhook] ${webhook.webhook_type} webhook received, no action needed`);
          break;

        default:
          logger.warn('[Webhook] Unknown webhook type', {
            type: webhook.webhook_type,
            code: webhook.webhook_code,
          });
      }

      // Mark as processed
      await this.markWebhookProcessed(webhookId);
    } catch (error) {
      logger.error('[Webhook] Processing failed', {
        webhookId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Handle ITEM webhooks (errors, login required, etc.)
   */
  private static async handleItemWebhook(webhook: PlaidWebhook, userId?: string): Promise<void> {
    switch (webhook.webhook_code) {
      case 'ERROR':
        // Item has an error (often means login required)
        if (userId && webhook.error) {
          await UserService.markItemError(
            userId,
            webhook.item_id,
            webhook.error.error_code
          );

          logger.warn('[Webhook] Item error detected', {
            userId,
            itemId: webhook.item_id,
            errorCode: webhook.error.error_code,
            errorMessage: webhook.error.error_message,
          });

          // Log security audit
          await LoggerService.audit({
            userId,
            eventType: AuditEventType.ITEM_ERROR,
            eventData: {
              itemId: webhook.item_id,
              errorCode: webhook.error.error_code,
              errorType: webhook.error.error_type,
            },
            success: false,
            errorMessage: webhook.error.error_message,
          });
        }
        break;

      case 'PENDING_EXPIRATION':
        // Access token will expire soon (7 days warning)
        logger.warn('[Webhook] Item access token expiring soon', {
          userId,
          itemId: webhook.item_id,
          consentExpirationTime: webhook.consent_expiration_time,
        });
        break;

      case 'USER_PERMISSION_REVOKED':
        // User revoked access at their bank
        if (userId) {
          await UserService.revokeItem(userId, webhook.item_id);

          logger.info('[Webhook] User revoked item permissions', {
            userId,
            itemId: webhook.item_id,
          });

          await LoggerService.audit({
            userId,
            eventType: AuditEventType.ITEM_DISCONNECTED,
            eventData: { itemId: webhook.item_id, reason: 'user_revoked' },
            success: true,
          });
        }
        break;

      case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
        // Plaid acknowledged webhook URL update
        logger.info('[Webhook] Webhook URL update acknowledged');
        break;

      default:
        logger.info(`[Webhook] ITEM.${webhook.webhook_code} received`);
    }
  }

  /**
   * Handle TRANSACTIONS webhooks (new transactions available)
   */
  private static async handleTransactionsWebhook(
    webhook: PlaidWebhook,
    userId?: string
  ): Promise<void> {
    switch (webhook.webhook_code) {
      case 'SYNC_UPDATES_AVAILABLE':
        logger.info('[Webhook] SYNC_UPDATES_AVAILABLE received', {
          userId,
          itemId: webhook.item_id,
        });
        try {
          await syncTransactionsForItem(webhook.item_id);
          logger.info(`[Webhook] Successfully synced transactions for item ${webhook.item_id}`);
        } catch (error) {
          logger.error(`[Webhook] Error syncing transactions for item ${webhook.item_id}`, { error });
        }
        break;

      case 'INITIAL_UPDATE':
        // Initial transaction pull completed
        logger.info('[Webhook] Initial transaction pull completed', {
          userId,
          itemId: webhook.item_id,
        });
        break;

      case 'HISTORICAL_UPDATE':
        // Historical transaction pull completed
        logger.info('[Webhook] Historical transaction pull completed', {
          userId,
          itemId: webhook.item_id,
        });
        break;

      case 'TRANSACTIONS_REMOVED':
        // Transactions were removed (usually corrections)
        logger.info('[Webhook] Transactions removed', {
          userId,
          itemId: webhook.item_id,
          removedTransactions: webhook.removed_transactions,
        });
        break;

      default:
        logger.info(`[Webhook] TRANSACTIONS.${webhook.webhook_code} received`);
    }
  }

  /**
   * Handle AUTH webhooks (verification status changes)
   */
  private static async handleAuthWebhook(webhook: PlaidWebhook, userId?: string): Promise<void> {
    switch (webhook.webhook_code) {
      case 'AUTOMATICALLY_VERIFIED':
        logger.info('[Webhook] Account automatically verified', {
          userId,
          itemId: webhook.item_id,
        });
        break;

      case 'VERIFICATION_EXPIRED':
        logger.warn('[Webhook] Account verification expired', {
          userId,
          itemId: webhook.item_id,
        });
        break;

      default:
        logger.info(`[Webhook] AUTH.${webhook.webhook_code} received`);
    }
  }

  /**
   * Find user by Plaid item ID
   */
  private static async findUserByItemId(itemId: string): Promise<string | undefined> {
    try {
      const result = await db
        .select({ userId: plaidItems.userId })
        .from(plaidItems)
        .where(eq(plaidItems.itemId, itemId))
        .limit(1);

      return result[0]?.userId;
    } catch (error) {
      logger.error('[Webhook] Failed to find user by item ID', {
        itemId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return undefined;
    }
  }

  /**
   * Get unprocessed webhooks (for batch processing)
   */
  public static async getUnprocessedWebhooks(limit: number = 100): Promise<WebhookRecord[]> {
    const result = await db
      .select()
      .from(plaidWebhooks)
      .where(eq(plaidWebhooks.processed, false))
      .orderBy(plaidWebhooks.receivedAt)
      .limit(limit);

    return result as WebhookRecord[];
  }

  /**
   * Get webhook history for an item
   */
  public static async getItemWebhookHistory(itemId: string, limit: number = 50): Promise<WebhookRecord[]> {
    const result = await db
      .select()
      .from(plaidWebhooks)
      .where(eq(plaidWebhooks.itemId, itemId))
      .orderBy(desc(plaidWebhooks.receivedAt))
      .limit(limit);

    return result as WebhookRecord[];
  }
}
