'use server';

import { auth } from '@/lib/auth';
import { pool } from '@/lib/db';
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
    const client = await pool.connect();

    try {
      const subResult = await client.query(
        `SELECT plan FROM subscription
         WHERE reference_id = $1
         AND status IN ('active', 'trialing')
         ORDER BY period_start DESC
         LIMIT 1`,
        [userId]
      );

      const subscription = subResult.rows[0];
      const plan = subscription?.plan || 'basic';

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
    } finally {
      client.release();
    }
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

      // Get user details and count of connected accounts
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'SELECT email, name FROM "user" WHERE id = $1',
          [userId]
        );

        const countResult = await client.query(
          'SELECT COUNT(*) FROM plaid_items WHERE user_id = $1 AND status = $2',
          [userId, 'active']
        );

        const user = userResult.rows[0];
        const accountCount = parseInt(countResult.rows[0]?.count || '0', 10);
        const isFirstAccount = accountCount === 1;

        if (user?.email && institutionName) {
          const userName = user.name || "there";

          await EmailService.sendBankConnectionConfirmation(
            user.email,
            userName,
            institutionName,
            isFirstAccount
          );

          console.log('[Server Action] Bank connection email sent to', user.email);
        }
      } finally {
        client.release();
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
