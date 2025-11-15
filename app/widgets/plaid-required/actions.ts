"use server";

import { createLinkToken, exchangePublicToken } from "@/lib/services/plaid-service";
import { UserService } from "@/lib/services/user-service";
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface PlaidInstitution {
  id?: string;
  name?: string;
}

/**
 * Get the current MCP access token from the session
 * This token can be passed to the /connect-bank popup for authentication
 */
export async function getMcpAccessToken() {
  try {
    console.log('[getMcpAccessToken] Starting...');
    const headersList = await headers();

    console.log('[getMcpAccessToken] Headers received:', {
      authorization: headersList.get('authorization') ? 'present' : 'missing',
      hasHeaders: !!headersList,
    });

    const mcpSession = await auth.api.getMcpSession({ headers: headersList });

    console.log('[getMcpAccessToken] MCP Session:', {
      hasSession: !!mcpSession,
      hasAccessToken: !!mcpSession?.accessToken,
      userId: mcpSession?.userId,
    });

    if (!mcpSession?.accessToken) {
      console.error('[getMcpAccessToken] No MCP session or access token found');
      return { success: false, error: "No MCP session found" };
    }

    console.log('[getMcpAccessToken] Success! Returning access token');
    return {
      success: true,
      accessToken: mcpSession.accessToken
    };
  } catch (error) {
    console.error("[getMcpAccessToken] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get access token"
    };
  }
}

/**
 * Creates a Plaid Link token for the specified user
 * @param userId - The user ID from the MCP session
 */
export async function createPlaidLinkToken(userId: string) {
  if (!userId) {
    return { success: false, error: "User ID is required" };
  }

  try {
    const { link_token } = await createLinkToken(userId);
    return { success: true, linkToken: link_token };
  } catch (error) {
    console.error("Error creating Plaid link token:", error);
    return { success: false, error: "Failed to create Plaid link token" };
  }
}

/**
 * Exchanges a Plaid public token for an access token and saves it
 * @param userId - The user ID from the MCP session
 * @param publicToken - The public token from Plaid Link
 * @param institution - The financial institution details
 */
export async function exchangePlaidPublicToken(
  userId: string,
  publicToken: string,
  institution: PlaidInstitution
) {
  if (!userId) {
    return { success: false, error: "User ID is required" };
  }

  try {
    const { accessToken, itemId } = await exchangePublicToken(publicToken);
    await UserService.savePlaidItem(userId, itemId, accessToken, institution.id, institution.name);
    return { success: true };
  } catch (error) {
    console.error("Error exchanging Plaid public token:", error);
    return { success: false, error: "Failed to exchange Plaid public token" };
  }
}
