/**
 * Type definitions for MCP tool responses following the OpenAI Apps SDK specification
 * Based on: https://modelcontextprotocol.io/specification/2025-06-18/server/tools
 *
 * Implements patterns from docs/mcp-builder/reference/mcp_best_practices.md
 */

// ============================================================================
// PAGINATION TYPES
// MCP Best Practice: Always include pagination metadata for list responses
// See: docs/mcp-builder/reference/mcp_best_practices.md#pagination
// ============================================================================

/**
 * Standard pagination metadata for list responses.
 * Include this in any tool that returns collections of items.
 */
export interface PaginationMeta {
  /** Total number of items available (across all pages) */
  total_count: number;
  /** Number of items in this response */
  count: number;
  /** Current offset (number of items skipped) */
  offset: number;
  /** Maximum items per page (from request) */
  limit: number;
  /** Whether more items exist beyond this page */
  has_more: boolean;
  /** Offset to use for the next page (only present if has_more is true) */
  next_offset?: number;
}

/**
 * Content types that can be returned in MCP responses
 * The model reads both content and structuredContent
 *
 * Based on MCP SDK ContentType from @modelcontextprotocol/sdk
 */
export type MCPContent =
  | { type: "text"; text: string; _meta?: Record<string, unknown> }
  | { type: "image"; data: string; mimeType: string; _meta?: Record<string, unknown> }
  | { type: "audio"; data: string; mimeType: string; _meta?: Record<string, unknown> }
  | {
      type: "resource";
      resource:
        | { uri: string; text: string; mimeType?: string; _meta?: Record<string, unknown> }
        | { uri: string; blob: string; mimeType?: string; _meta?: Record<string, unknown> };
      _meta?: Record<string, unknown>;
    };

/**
 * OpenAI-specific metadata for tool responses
 * These control how ChatGPT renders and interacts with the response
 *
 * Reference: https://developers.openai.com/apps-sdk/reference
 */
export interface OpenAIResponseMetadata {
  // ============================================================================
  // WIDGET RENDERING CONFIGURATION
  // ============================================================================

  /** Resource URI for component HTML template (e.g., "ui://widget/my-widget.html") */
  "openai/outputTemplate"?: string;

  /** Widget description surfaced to the model when the component loads */
  "openai/widgetDescription"?: string;

  /** Hint that the component should render inside a bordered card */
  "openai/widgetPrefersBorder"?: boolean;

  /** Whether the widget can call tools on its own via window.openai.callTool() */
  "openai/widgetAccessible"?: boolean;

  /** Whether this result can produce a widget */
  "openai/resultCanProduceWidget"?: boolean;

  /** Dedicated subdomain for hosted components (defaults to web-sandbox.oaiusercontent.com) */
  "openai/widgetDomain"?: string;

  /** CSP configuration for the widget iframe */
  "openai/widgetCSP"?: {
    /** Allowed domains for fetch/XHR requests (maps to connect-src) */
    connect_domains?: string[];
    /** Allowed domains for assets - style-src, img-src, font-src, etc. */
    resource_domains?: string[];
  };

  /** Unique session ID for correlating multiple calls within a widget lifecycle */
  "openai/widgetSessionId"?: string;

  /** Instruct the host to close/unmount the widget after this response */
  "openai/closeWidget"?: boolean;

  // ============================================================================
  // TOOL INVOCATION STATUS
  // ============================================================================

  /** Short status text while the tool runs (≤64 chars, shown in ChatGPT UI) */
  "openai/toolInvocation/invoking"?: string;

  /** Short status text after the tool completes (≤64 chars, shown in ChatGPT UI) */
  "openai/toolInvocation/invoked"?: string;

  // ============================================================================
  // TOOL VISIBILITY
  // ============================================================================

  /** Control tool visibility: "public" (default) or "private" (hidden from model but callable) */
  "openai/visibility"?: "public" | "private";

  // ============================================================================
  // CLIENT-PROVIDED METADATA (sent by ChatGPT, use for personalization)
  // IMPORTANT: Never rely on these for authorization!
  // ============================================================================

  /** Requested locale (BCP 47, e.g., "en-US", "de-DE") */
  "openai/locale"?: string;

  /** User agent hint for analytics or formatting */
  "openai/userAgent"?: string | {
    device?: { type?: "mobile" | "tablet" | "desktop" | "unknown" };
    capabilities?: { hover?: boolean; touch?: boolean };
  };

  /** Coarse location hint (not precise - do not use for geofencing) */
  "openai/userLocation"?: {
    city?: string;
    region?: string;
    country?: string;
    timezone?: string;
    longitude?: number;
    latitude?: number;
  };

  /** Anonymized user id for rate limiting and identification (not auth!) */
  "openai/subject"?: string;

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /** RFC 7235 WWW-Authenticate challenges to trigger OAuth flow */
  "mcp/www_authenticate"?: string | string[];

  // ============================================================================
  // LEGACY / COMPATIBILITY
  // ============================================================================

  /** Legacy locale key (prefer openai/locale) */
  "webplus/i18n"?: string;

  /** Additional metadata - allow arbitrary keys */
  [key: string]: unknown;
}

/**
 * Standard MCP tool response
 * This is what your tool handlers should return
 */
export interface MCPToolResponse<
  TStructuredContent extends Record<string, unknown> = Record<string, unknown>,
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  /**
   * Content surfaced to both the model and the component
   * Use this for narration and display text
   */
  content: MCPContent[];

  /**
   * Structured data surfaced to the model and the component
   * Must match the declared outputSchema when provided
   * Keep this concise - the model reads it verbatim
   */
  structuredContent?: TStructuredContent;

  /**
   * Metadata delivered ONLY to the component, hidden from the model
   * Use this for large datasets, UI-only fields, or sensitive data
   */
  _meta?: TMetadata & Partial<OpenAIResponseMetadata>;

  /**
   * Whether this response represents an error
   */
  isError?: boolean;

  /** Additional fields allowed by MCP spec */
  [key: string]: unknown;
}

/**
 * Helper to create a text content item with proper typing
 */
export const createTextContent = (text: string, meta?: Record<string, unknown>): MCPContent => ({
  type: "text" as const,
  text,
  ...(meta && { _meta: meta })
});

/**
 * Helper to create an image content item with proper typing
 */
export const createImageContent = (
  data: string,
  mimeType: string,
  meta?: Record<string, unknown>
): MCPContent => ({
  type: "image" as const,
  data,
  mimeType,
  ...(meta && { _meta: meta })
});

/**
 * Helper to create a resource content item with proper typing
 * Note: Must provide either `text` or `blob`
 */
export const createResourceContent = (
  uri: string,
  content: { text: string; mimeType?: string } | { blob: string; mimeType?: string },
  meta?: Record<string, unknown>
): MCPContent => ({
  type: "resource" as const,
  resource: {
    uri,
    ...content
  },
  ...(meta && { _meta: meta })
});

/**
 * Helper to create a complete MCP tool response with proper typing
 */
export const createMCPResponse = <
  TStructuredContent extends Record<string, unknown> = Record<string, unknown>,
  TMetadata extends Record<string, unknown> = Record<string, unknown>
>(
  content: MCPContent[],
  options?: {
    structuredContent?: TStructuredContent;
    _meta?: TMetadata & Partial<OpenAIResponseMetadata>;
    isError?: boolean;
  }
): MCPToolResponse<TStructuredContent, TMetadata> => ({
  content,
  ...(options?.structuredContent !== undefined && { structuredContent: options.structuredContent }),
  ...(options?._meta && { _meta: options._meta }),
  ...(options?.isError !== undefined && { isError: options.isError })
});
