'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { plaidItems, plaidAccounts, subscription } from '@/lib/db/schema';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { ItemDeletionService } from '@/lib/services/item-deletion-service';
import { getMaxAccountsForPlan, formatAccountLimit } from '@/lib/utils/plan-limits';

export interface ConnectedItem {
  id: string;
  institutionId: string | null;
  institutionName: string | null;
  institutionLogo?: string;
  accountCount: number;
  status: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  connectedAt: string;
}

export interface ConnectItemStatus {
  items: ConnectedItem[];
  planLimits: {
    current: number;
    max: number;
    maxFormatted: string;
    planName: string;
  };
  deletionStatus: {
    canDelete: boolean;
    lastDeletionDate?: string;
    daysUntilNext?: number;
  };
  canConnect: boolean;
}

type StatusResult =
  | { success: true; data: ConnectItemStatus }
  | { success: false; error: string };

type DeleteResult =
  | { success: true }
  | { success: false; error: string; daysUntilNext?: number };

/**
 * Get connect item status for the current user
 * @param userId - Optional user ID. If not provided, will fetch from session.
 */
export async function getConnectItemStatus(userId?: string): Promise<StatusResult> {
  try {
    let resolvedUserId: string;

    // If userId is provided directly (from MCP), use it
    if (userId) {
      resolvedUserId = userId;
    } else {
      // Otherwise fetch from Next.js headers (for widget server actions)
      const headersList = await headers();
      const session = await auth.api.getSession({ headers: headersList });

      if (!session?.user) {
        return {
          success: false,
          error: 'Authentication required',
        };
      }

      resolvedUserId = session.user.id;
    }

    // Get user's subscription and plan
    const userSubscriptions = await db
      .select({ plan: subscription.plan })
      .from(subscription)
      .where(
        and(
          eq(subscription.referenceId, resolvedUserId),
          inArray(subscription.status, ['active', 'trialing'])
        )
      )
      .orderBy(desc(subscription.periodStart))
      .limit(1);

    const userSubscription = userSubscriptions[0];
    const plan = userSubscription?.plan || null;
    const maxAccounts = getMaxAccountsForPlan(plan);

    console.log('[getConnectItemStatus] Subscription check:', {
      hasSubscription: !!userSubscription,
      plan,
      maxAccounts,
      userId: resolvedUserId,
    });

    // If no active subscription, return error
    if (!plan || maxAccounts === null) {
      console.log('[getConnectItemStatus] No subscription - returning error');
      return {
        success: false,
        error: "Active subscription required to manage accounts",
      };
    }

    // Get all active/pending/error items (exclude deleted and revoked)
    const items = await db
      .select({
        id: plaidItems.id,
        itemId: plaidItems.itemId,
        institutionId: plaidItems.institutionId,
        institutionName: plaidItems.institutionName,
        status: plaidItems.status,
        errorCode: plaidItems.errorCode,
        errorMessage: plaidItems.errorMessage,
        createdAt: plaidItems.createdAt,
        accountCount: sql<number>`COUNT(DISTINCT ${plaidAccounts.id})`,
      })
      .from(plaidItems)
      .leftJoin(plaidAccounts, eq(plaidItems.itemId, plaidAccounts.itemId))
      .where(
        and(
          eq(plaidItems.userId, resolvedUserId),
          inArray(plaidItems.status, ['pending', 'active', 'error'])
        )
      )
      .groupBy(
        plaidItems.id,
        plaidItems.itemId,
        plaidItems.institutionId,
        plaidItems.institutionName,
        plaidItems.status,
        plaidItems.errorCode,
        plaidItems.errorMessage,
        plaidItems.createdAt
      );

    const connectedItems: ConnectedItem[] = items.map((item) => ({
      id: item.id,
      institutionId: item.institutionId,
      institutionName: item.institutionName,
      accountCount: Number(item.accountCount),
      status: item.status,
      errorCode: item.errorCode,
      errorMessage: item.errorMessage,
      connectedAt: item.createdAt.toISOString(),
    }));

    // Get deletion status
    const deletionStatus = await ItemDeletionService.getDeletionInfo(resolvedUserId);

    return {
      success: true,
      data: {
        items: connectedItems,
        planLimits: {
          current: items.length,
          max: maxAccounts,
          maxFormatted: formatAccountLimit(maxAccounts),
          planName: plan,
        },
        deletionStatus,
        canConnect: items.length < maxAccounts,
      },
    };
  } catch (error) {
    console.error('[Connect Item] Error getting status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get status',
    };
  }
}

/**
 * Delete an item (with rate limit check)
 */
export async function deleteItem(itemId: string): Promise<DeleteResult> {
  try {
    // Check authentication
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    const userId = session.user.id;

    // Delete with rate limit check
    await ItemDeletionService.deleteItemWithRateLimit(userId, itemId);

    return { success: true };
  } catch (error) {
    console.error('[Connect Item] Error deleting item:', error);

    if (error instanceof Error && error.message.includes('rate limit')) {
      // Try to get deletion info if possible
      try {
        const headersList = await headers();
        const session = await auth.api.getSession({ headers: headersList });
        if (session?.user) {
          const info = await ItemDeletionService.getDeletionInfo(session.user.id);
          return {
            success: false,
            error: error.message,
            daysUntilNext: info.daysUntilNext,
          };
        }
      } catch {
        // Fallback to just error message
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete item',
    };
  }
}

// Duplicate detection removed - we show connected items in the UI
// Users can see what they've already connected and make their own decisions
