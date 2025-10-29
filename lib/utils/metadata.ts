/**
 * OpenAI Metadata Extraction Utilities
 *
 * Extracts and validates OpenAI Apps SDK metadata from tool parameters.
 */

import type { OpenAIMetadata, ToolExecutionContext } from '../types';
import type { McpSession } from '../auth/mcp-auth';

/**
 * Extract OpenAI metadata from tool parameters
 *
 * ChatGPT sends metadata in the `_meta` field of tool parameters:
 * - openai/userAgent: Browser/device info
 * - openai/locale: User's language preference
 * - openai/userLocation: Geographic location and timezone
 * - openai/subject: Session identifier
 *
 * @param params - Tool parameters from MCP call
 * @returns OpenAI metadata if present, undefined otherwise
 *
 * @example
 * const metadata = extractOpenAIMetadata(params);
 * if (metadata) {
 *   console.log(`User locale: ${metadata['openai/locale']}`);
 *   console.log(`User timezone: ${metadata['openai/userLocation'].timezone}`);
 * }
 */
export function extractOpenAIMetadata(params: any): OpenAIMetadata | undefined {
  const meta = params?._meta;

  if (!meta || typeof meta !== 'object') {
    return undefined;
  }

  // Check if this looks like OpenAI metadata
  const hasOpenAIFields =
    meta['openai/userAgent'] ||
    meta['openai/locale'] ||
    meta['openai/userLocation'] ||
    meta['openai/subject'];

  if (!hasOpenAIFields) {
    return undefined;
  }

  // Return validated metadata
  // Allow partial metadata - not all fields may be present
  return {
    'openai/userAgent': meta['openai/userAgent'] || 'unknown',
    'openai/locale': meta['openai/locale'] || 'en-US',
    'openai/userLocation': meta['openai/userLocation'] || {
      city: 'Unknown',
      region: 'Unknown',
      country: 'US',
      timezone: 'UTC',
      latitude: '0',
      longitude: '0',
    },
    'openai/subject': meta['openai/subject'] || 'unknown',
  };
}

/**
 * Create a tool execution context from session and parameters
 *
 * Combines authentication (from session) with OpenAI metadata (from params)
 * to provide a complete context for tool execution.
 *
 * @param session - Authenticated MCP session
 * @param plaidAccessTokens - User's Plaid access tokens
 * @param params - Tool parameters (may contain _meta)
 * @returns Complete execution context
 *
 * @example
 * const context = createToolContext(session, tokens, params);
 * const formatter = new LocaleFormatter(context.metadata);
 * return formatter.formatCurrency(balance, 'USD');
 */
export function createToolContext(
  session: McpSession,
  plaidAccessTokens: string[],
  params?: any
): ToolExecutionContext {
  const metadata = params ? extractOpenAIMetadata(params) : undefined;

  return {
    userId: session.userId,
    sessionId: session.sessionId,
    metadata,
    plaidAccessTokens,
  };
}
