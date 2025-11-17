'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { user, subscription } from '@/lib/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { headers, cookies } from 'next/headers';
import { hasActiveSubscription } from '@/lib/utils/subscription-helpers';
import { createLinkToken, exchangePublicToken } from '@/lib/services/plaid-service';
import { UserService } from '@/lib/services/user-service';

type LinkTokenResult =
  | { success: true; linkToken: string; expiration: string }
  | { success: false; error: string };

type ExchangeTokenResult =
  | { success: true; itemId: string; institutionName: string | null | undefined }
  | { success: false; error: string };

type PlaidMetadata = {
  institution?: {
    institution_id?: string | null;
    name?: string | null;
  } | null;
};

export const createPlaidLinkToken = async (mcpToken?: string): Promise<LinkTokenResult> => {
  try {
    // Check 1: Authentication
    const headersList = await headers();

    // If token provided (from popup URL), create headers with it
    const authHeaders = new Headers(headersList);
    if (mcpToken) {
      console.log('[Server Action] Using MCP token from URL parameter');
      authHeaders.set('Authorization', `Bearer ${mcpToken}`);
    }

    console.log('[Server Action] Authorization header:', authHeaders.get('authorization') ? 'present' : 'missing');

    // Check for MCP session (required - users authenticate via ChatGPT OAuth)
    const mcpSession = await auth.api.getMcpSession({ headers: authHeaders });
    console.log('[Server Action] MCP Session result:', {
      hasSession: !!mcpSession,
      userId: mcpSession?.userId,
    });

    if (!mcpSession?.userId) {
      return {
        success: false,
        error: 'Authentication required. Please sign in first through ChatGPT.',
      };
    }

    const userId = mcpSession.userId;

    // Check 2: Active Subscription
    const hasSubscription = await hasActiveSubscription(userId);
    if (!hasSubscription) {
      return {
        success: false,
        error: 'Active subscription required. Please subscribe first.',
      };
    }

    // Check 3: Account limits (based on subscription plan)
    const existingItems = await UserService.getUserPlaidItems(userId, true);

    // Get user's subscription to check limits
    const userSubscriptions = await db
      .select({ plan: subscription.plan })
      .from(subscription)
      .where(
        and(
          eq(subscription.referenceId, userId),
          inArray(subscription.status, ['active', 'trialing'])
        )
      )
      .orderBy(desc(subscription.periodStart))
      .limit(1);

    const userSubscription = userSubscriptions[0];
    const plan = userSubscription?.plan || 'basic';

    // Map plan to account limits (matches auth config in lib/auth/index.ts)
    const planLimits: Record<string, number> = {
      basic: 3,
      pro: 10,
      enterprise: 999999,
    };
    const maxAccounts = planLimits[plan] ?? 3;

    if (existingItems.length >= maxAccounts) {
      return {
        success: false,
        error: `Account limit reached. Your plan allows ${maxAccounts} bank account(s). Please upgrade or remove an existing connection.`,
      };
    }

    // All checks passed - create link token
    const linkTokenData = await createLinkToken(userId);

    return {
      success: true,
      linkToken: linkTokenData.link_token,
      expiration: linkTokenData.expiration,
    };
  } catch (error) {
    console.error('[Server Action] createPlaidLinkToken error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize bank connection',
    };
  }
};

export const exchangePlaidPublicToken = async (
  publicToken: string,
  metadata: PlaidMetadata,
  mcpToken?: string
): Promise<ExchangeTokenResult> => {
  try {
    // Check 1: Authentication
    const headersList = await headers();

    // If token provided (from popup URL), create headers with it
    const authHeaders = new Headers(headersList);
    if (mcpToken) {
      console.log('[Server Action] Using MCP token from URL parameter');
      authHeaders.set('Authorization', `Bearer ${mcpToken}`);
    }

    // Check for MCP session (required - users authenticate via ChatGPT OAuth)
    const mcpSession = await auth.api.getMcpSession({ headers: authHeaders });
    console.log('[Server Action] MCP Session result:', {
      hasSession: !!mcpSession,
      userId: mcpSession?.userId,
    });

    if (!mcpSession?.userId) {
      return {
        success: false,
        error: 'Authentication required. Please sign in first through ChatGPT.',
      };
    }

    const userId = mcpSession.userId;

    // Check 2: Active Subscription
    const hasSubscription = await hasActiveSubscription(userId);
    if (!hasSubscription) {
      return {
        success: false,
        error: 'Active subscription required. Please subscribe first.',
      };
    }

    if (!publicToken) {
      return {
        success: false,
        error: 'Missing public token',
      };
    }

    // Exchange public token for access token
    const { accessToken, itemId } = await exchangePublicToken(publicToken);

    // Extract institution info from metadata
    const institutionId = metadata?.institution?.institution_id || undefined;
    const institutionName = metadata?.institution?.name || undefined;

    // Save the Plaid item to database (access token will be encrypted)
    await UserService.savePlaidItem(
      userId,
      itemId,
      accessToken,
      institutionId,
      institutionName
    );

    console.log('[Server Action] Successfully connected Plaid item', {
      userId,
      itemId,
      institutionName,
    });

    // Send email notification
    try {
      const { EmailService } = await import("@/lib/services/email-service");
      const { plaidItems } = await import("@/lib/db/schema");
      const { count } = await import("drizzle-orm");

      // Get user details and count of connected accounts
      const [userDetails] = await db
        .select({ email: user.email, name: user.name })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      const [itemCount] = await db
        .select({ count: count() })
        .from(plaidItems)
        .where(
          and(
            eq(plaidItems.userId, userId),
            eq(plaidItems.status, 'active')
          )
        );

      const accountCount = Number(itemCount?.count || 0);
      const isFirstAccount = accountCount === 1;

      if (userDetails?.email && institutionName) {
        const userName = userDetails.name || "there";

        await EmailService.sendBankConnectionConfirmation(
          userDetails.email,
          userName,
          institutionName,
          isFirstAccount
        );

        console.log('[Server Action] Bank connection email sent to', userDetails.email);
      }
    } catch (error) {
      console.error('[Server Action] Failed to send bank connection email:', error);
      // Don't throw - email failure shouldn't block connection
    }

    return {
      success: true,
      itemId,
      institutionName,
    };
  } catch (error) {
    console.error('[Server Action] exchangePlaidPublicToken error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect bank account',
    };
  }
};
