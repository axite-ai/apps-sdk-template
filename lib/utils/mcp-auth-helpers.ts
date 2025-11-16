/**
 * MCP Tool Authentication Helpers
 *
 * DRY helpers to check authentication requirements in MCP tools.
 * Reduces boilerplate and ensures consistency across all tools.
 */

import { hasActiveSubscription } from "./subscription-helpers";
import { UserService } from "../services/user-service";
import {
  createLoginPromptResponse,
  createSubscriptionRequiredResponse,
  createPlaidRequiredResponse,
} from "./auth-responses";

interface AuthRequirements {
  /** Require active subscription (default: true) */
  requireSubscription?: boolean;
  /** Require Plaid bank connection (default: true) */
  requirePlaid?: boolean;
  /** Request headers (required for Plaid check to extract MCP token) */
  headers?: Headers;
}

/**
 * Check authentication requirements and return error response if needed.
 * Returns null if all checks pass.
 *
 * @param session - MCP session from withMcpAuth
 * @param featureName - Name of the feature being accessed (for error messages)
 * @param options - Auth requirement options
 * @returns Auth error response or null if all checks pass
 *
 * @example
 * ```typescript
 * server.registerTool("get_transactions", config, async () => {
 *   const authCheck = await requireAuth(session, "transactions", {
 *     requireSubscription: true,
 *     requirePlaid: true,
 *     headers: req.headers,
 *   });
 *   if (authCheck) return authCheck;
 *
 *   // ... actual tool logic
 * });
 * ```
 */
export async function requireAuth(
  session: { userId: string } | null | undefined,
  featureName: string,
  options: AuthRequirements = {}
) {
  const { requireSubscription = true, requirePlaid = true, headers } = options;

  // Check 1: Session exists (OAuth authentication)
  if (!session) {
    return createLoginPromptResponse(featureName);
  }

  // Check 2: Active subscription (if required)
  if (requireSubscription && !(await hasActiveSubscription(session.userId))) {
    return createSubscriptionRequiredResponse(featureName, session.userId);
  }

  // Check 3: Plaid connection (if required)
  if (requirePlaid) {
    const accessTokens = await UserService.getUserAccessTokens(session.userId);
    if (accessTokens.length === 0) {
      if (!headers) {
        throw new Error(
          `[requireAuth] Headers required for Plaid check but not provided for feature: ${featureName}`
        );
      }
      return await createPlaidRequiredResponse(session.userId, headers);
    }
  }

  // All checks passed
  return null;
}
