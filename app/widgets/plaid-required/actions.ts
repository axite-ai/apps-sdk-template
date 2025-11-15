"use server";

import { createLinkToken, exchangePublicToken } from "@/lib/services/plaid-service";
import { UserService } from "@/lib/services/user-service";

interface PlaidInstitution {
  id?: string;
  name?: string;
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
