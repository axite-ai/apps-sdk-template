/**
 * Item Deletion Service
 *
 * Handles Plaid item deletion with rate limiting (1 deletion per user per month).
 * Implements soft delete strategy and maintains audit trail.
 */

import { db } from '@/lib/db';
import { plaidItems, plaidItemDeletions } from '@/lib/db/schema';
import { eq, and, gte, desc, inArray } from 'drizzle-orm';
import { logger } from './logger-service';
import { plaidClient } from './plaid-service';
import { EncryptionService } from './encryption-service';

const DELETION_RATE_LIMIT_DAYS = 30;

export interface DeletionInfo {
  canDelete: boolean;
  lastDeletionDate?: string;
  daysUntilNext?: number;
}

/**
 * Item Deletion Service
 */
export class ItemDeletionService {
  /**
   * Check if user can delete an item (rate limit: 1 deletion per 30 days)
   */
  public static async canUserDeleteItem(userId: string): Promise<boolean> {
    const thirtyDaysAgo = new Date(Date.now() - DELETION_RATE_LIMIT_DAYS * 24 * 60 * 60 * 1000);

    const recentDeletions = await db
      .select()
      .from(plaidItemDeletions)
      .where(
        and(
          eq(plaidItemDeletions.userId, userId),
          gte(plaidItemDeletions.deletedAt, thirtyDaysAgo)
        )
      );

    return recentDeletions.length === 0;
  }

  /**
   * Get deletion information for a user
   */
  public static async getDeletionInfo(userId: string): Promise<DeletionInfo> {
    const thirtyDaysAgo = new Date(Date.now() - DELETION_RATE_LIMIT_DAYS * 24 * 60 * 60 * 1000);

    const [lastDeletion] = await db
      .select()
      .from(plaidItemDeletions)
      .where(eq(plaidItemDeletions.userId, userId))
      .orderBy(desc(plaidItemDeletions.deletedAt))
      .limit(1);

    if (!lastDeletion || lastDeletion.deletedAt < thirtyDaysAgo) {
      return { canDelete: true };
    }

    const nextAllowedDate = new Date(lastDeletion.deletedAt);
    nextAllowedDate.setDate(nextAllowedDate.getDate() + DELETION_RATE_LIMIT_DAYS);

    const daysUntilNext = Math.ceil(
      (nextAllowedDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    return {
      canDelete: false,
      lastDeletionDate: lastDeletion.deletedAt.toISOString(),
      daysUntilNext,
    };
  }

  /**
   * Record deletion in audit log
   */
  private static async recordDeletion(
    userId: string,
    itemId: string,
    institutionId: string | null,
    institutionName: string | null,
    reason: string = 'user_initiated'
  ): Promise<void> {
    await db.insert(plaidItemDeletions).values({
      userId,
      itemId,
      institutionId,
      institutionName,
      deletedAt: new Date(),
      reason,
    });

    logger.info('[ItemDeletion] Recorded deletion', {
      userId,
      itemId,
      institutionName,
      reason,
    });
  }

  /**
   * Delete item with rate limit check
   * Implements soft delete and calls Plaid /item/remove API
   */
  public static async deleteItemWithRateLimit(
    userId: string,
    itemDbId: string
  ): Promise<void> {
    // 1. Check rate limit
    const canDelete = await this.canUserDeleteItem(userId);
    if (!canDelete) {
      const info = await this.getDeletionInfo(userId);
      throw new Error(
        `Deletion rate limit exceeded. You can delete another item in ${info.daysUntilNext} days.`
      );
    }

    // 2. Get item details for audit log
    const [item] = await db
      .select()
      .from(plaidItems)
      .where(and(eq(plaidItems.userId, userId), eq(plaidItems.id, itemDbId)))
      .limit(1);

    if (!item) {
      throw new Error('Item not found or does not belong to user');
    }

    // Check if item is already deleted
    if (item.status === 'deleted') {
      throw new Error('Item is already deleted');
    }

    // 3. Call Plaid /item/remove API
    try {
      const accessToken = EncryptionService.decrypt(item.accessToken);
      await plaidClient.itemRemove({ access_token: accessToken });
      logger.info('[ItemDeletion] Plaid item removed via API', {
        userId,
        itemId: item.itemId,
      });
    } catch (error) {
      // Log but continue - item may already be removed or access revoked
      logger.warn('[ItemDeletion] Plaid item removal failed (continuing with soft delete)', {
        userId,
        itemId: item.itemId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // 4. Soft delete in DB (set status to 'deleted', record deletedAt)
    await db
      .update(plaidItems)
      .set({
        status: 'deleted',
        deletedAt: new Date(),
      })
      .where(eq(plaidItems.id, itemDbId));

    // 5. Record in audit log
    await this.recordDeletion(
      userId,
      item.itemId,
      item.institutionId,
      item.institutionName,
      'user_initiated'
    );

    logger.info('[ItemDeletion] Item soft deleted successfully', {
      userId,
      itemId: item.itemId,
      institutionName: item.institutionName,
    });

    // 6. Webhook WEBHOOK_UPDATE_ACKNOWLEDGED will be received to confirm deletion
  }

  /**
   * Get all deleted items for a user (for audit purposes)
   */
  public static async getUserDeletedItems(userId: string): Promise<any[]> {
    return await db
      .select()
      .from(plaidItemDeletions)
      .where(eq(plaidItemDeletions.userId, userId))
      .orderBy(desc(plaidItemDeletions.deletedAt));
  }

  /**
   * Get deletion count for a user in the last N days
   */
  public static async getDeletionCount(userId: string, days: number = 30): Promise<number> {
    const nDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const deletions = await db
      .select()
      .from(plaidItemDeletions)
      .where(
        and(
          eq(plaidItemDeletions.userId, userId),
          gte(plaidItemDeletions.deletedAt, nDaysAgo)
        )
      );

    return deletions.length;
  }
}
