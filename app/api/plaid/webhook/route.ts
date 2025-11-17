import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { plaidLinkSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { WebhookService } from '@/lib/services/webhook-service';
import { exchangePublicToken } from '@/lib/services/plaid-service';
import { UserService } from '@/lib/services/user-service';

/**
 * Plaid Webhook Handler
 *
 * Handles webhooks from Plaid for:
 * - Multi-Item Link: SESSION_FINISHED, ITEM_ADD_RESULT
 * - Item events: ITEM.ERROR, ITEM.PENDING_EXPIRATION, etc.
 * - Transaction events: TRANSACTIONS.SYNC_UPDATES_AVAILABLE, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const webhook = JSON.parse(body);

    console.log('[Plaid Webhook] Received:', {
      type: webhook.webhook_type,
      code: webhook.webhook_code,
    });

    // Verify webhook signature (if configured)
    const signature = request.headers.get('plaid-verification');
    if (signature && !WebhookService.verifyWebhookSignature(body, signature)) {
      console.error('[Plaid Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Handle Multi-Item Link webhooks
    if (webhook.webhook_type === 'LINK') {
      await handleLinkWebhook(webhook);
      return NextResponse.json({ received: true });
    }

    // Handle other webhook types (Item, Transactions, etc.)
    await WebhookService.processWebhook(webhook);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Plaid Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle LINK webhook events for Multi-Item Link
 */
async function handleLinkWebhook(webhook: any) {
  const { webhook_code, link_session_id, link_token, public_token, public_tokens } = webhook;

  console.log('[Link Webhook] Processing:', {
    code: webhook_code,
    linkSessionId: link_session_id,
    linkToken: link_token,
  });

  // Find the link session in our database
  const [session] = await db
    .select()
    .from(plaidLinkSessions)
    .where(eq(plaidLinkSessions.linkToken, link_token))
    .limit(1);

  if (!session) {
    console.error('[Link Webhook] Session not found for link_token:', link_token);
    return;
  }

  try {
    switch (webhook_code) {
      case 'ITEM_ADD_RESULT':
        // Single item was added during Multi-Item Link session
        await handleItemAddResult(session, public_token, webhook);
        break;

      case 'SESSION_FINISHED':
        // Entire Multi-Item Link session completed
        await handleSessionFinished(session, public_tokens, webhook);
        break;

      case 'HANDOFF':
        // User was redirected to Link from another application
        await db
          .update(plaidLinkSessions)
          .set({
            linkSessionId: link_session_id,
            status: 'active',
          })
          .where(eq(plaidLinkSessions.id, session.id));
        break;

      default:
        console.log('[Link Webhook] Unhandled code:', webhook_code);
    }
  } catch (error) {
    console.error('[Link Webhook] Error handling webhook:', error);

    // Mark session as failed
    await db
      .update(plaidLinkSessions)
      .set({
        status: 'failed',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      })
      .where(eq(plaidLinkSessions.id, session.id));

    throw error;
  }
}

/**
 * Handle individual item add during Multi-Item Link session
 */
async function handleItemAddResult(
  session: any,
  publicToken: string,
  webhook: any
) {
  console.log('[Link Webhook] Processing ITEM_ADD_RESULT for session:', session.id);

  if (!publicToken) {
    console.error('[Link Webhook] No public token in ITEM_ADD_RESULT');
    return;
  }

  try {
    // Exchange public token for access token
    const { accessToken, itemId } = await exchangePublicToken(publicToken);

    // Extract institution info from webhook metadata if available
    const institutionId = webhook.institution?.institution_id;
    const institutionName = webhook.institution?.name;

    // Save the Plaid item
    await UserService.savePlaidItem(
      session.userId,
      itemId,
      accessToken,
      institutionId,
      institutionName
    );

    // Update session with incremented items count
    await db
      .update(plaidLinkSessions)
      .set({
        linkSessionId: webhook.link_session_id,
        status: 'active',
        itemsAdded: (session.itemsAdded || 0) + 1,
        metadata: {
          ...session.metadata,
          lastItemAdded: {
            itemId,
            institutionId,
            institutionName,
            addedAt: new Date().toISOString(),
          },
        },
      })
      .where(eq(plaidLinkSessions.id, session.id));

    console.log('[Link Webhook] Successfully added item:', itemId);
  } catch (error) {
    console.error('[Link Webhook] Error processing ITEM_ADD_RESULT:', error);
    throw error;
  }
}

/**
 * Handle session finished event (all items added, user exited Link)
 */
async function handleSessionFinished(
  session: any,
  publicTokens: string[] | undefined,
  webhook: any
) {
  console.log('[Link Webhook] Processing SESSION_FINISHED for session:', session.id);

  const status = webhook.status; // SUCCESS, EXIT, ERROR

  // If session was successful but we haven't processed items via ITEM_ADD_RESULT,
  // process them now
  if (status === 'SUCCESS' && publicTokens && publicTokens.length > 0) {
    console.log('[Link Webhook] Processing public tokens from SESSION_FINISHED');

    for (const publicToken of publicTokens) {
      try {
        // Only process if we haven't already (check by counting items)
        // This is a safety check in case ITEM_ADD_RESULT webhooks were missed
        const { accessToken, itemId } = await exchangePublicToken(publicToken);

        // Check if item already exists
        const existingItems = await UserService.getUserPlaidItems(session.userId);
        const alreadyExists = existingItems.some(item => item.itemId === itemId);

        if (!alreadyExists) {
          await UserService.savePlaidItem(
            session.userId,
            itemId,
            accessToken,
            undefined,
            undefined
          );
          console.log('[Link Webhook] Added item from SESSION_FINISHED:', itemId);
        }
      } catch (error) {
        console.error('[Link Webhook] Error processing public token:', error);
        // Continue processing other tokens
      }
    }
  }

  // Update session as completed
  await db
    .update(plaidLinkSessions)
    .set({
      linkSessionId: webhook.link_session_id,
      status: status === 'SUCCESS' ? 'completed' : 'failed',
      publicTokens: publicTokens || [],
      completedAt: new Date(),
      metadata: {
        ...session.metadata,
        sessionStatus: status,
        finishedAt: new Date().toISOString(),
      },
    })
    .where(eq(plaidLinkSessions.id, session.id));

  console.log('[Link Webhook] Session finished with status:', status);
}
