/**
 * Client Metadata Utilities
 *
 * Helpers for extracting and using client-provided metadata from MCP tool calls.
 * ChatGPT provides these hints during initialization and tool invocation.
 *
 * Available metadata (from Apps SDK):
 * - openai/locale: User's preferred locale (BCP 47, e.g., "en-US")
 * - openai/userLocation: Coarse location hint (city, region, country, timezone)
 * - openai/userAgent: Device type and capabilities
 * - openai/subject: Anonymized user ID for rate limiting
 *
 * IMPORTANT: Never rely on these hints for authorization - they are hints only.
 * Always enforce auth in your MCP server and backing APIs.
 *
 * See: https://developers.openai.com/apps-sdk/reference
 */

/**
 * User location information provided by ChatGPT
 * This is a coarse location hint, not precise GPS coordinates
 */
export interface UserLocation {
  /** City name (e.g., "San Francisco") */
  city?: string;
  /** Region/state (e.g., "California") */
  region?: string;
  /** Country code (e.g., "US") */
  country?: string;
  /** IANA timezone (e.g., "America/Los_Angeles") */
  timezone?: string;
  /** Approximate longitude (if available) */
  longitude?: number;
  /** Approximate latitude (if available) */
  latitude?: number;
}

/**
 * User agent information provided by ChatGPT
 */
export interface UserAgentInfo {
  /** Device type */
  device?: {
    type?: "mobile" | "tablet" | "desktop" | "unknown";
  };
  /** Device capabilities */
  capabilities?: {
    hover?: boolean;
    touch?: boolean;
  };
}

/**
 * All client metadata that may be provided by ChatGPT during tool calls
 */
export interface ClientMetadata {
  /** User's preferred locale (BCP 47 format, e.g., "en-US", "de-DE") */
  locale?: string;
  /** Coarse user location hint */
  userLocation?: UserLocation;
  /** User agent / device information */
  userAgent?: UserAgentInfo | string;
  /** Anonymized user ID for rate limiting (do not use for auth!) */
  subject?: string;
}

/**
 * Extract client metadata from MCP tool call extra parameters
 *
 * ChatGPT includes client metadata in the _meta field of tool calls.
 * Use this helper to safely extract and type the metadata.
 *
 * @example
 * ```typescript
 * async (rawParams, extra) => {
 *   const clientMeta = extractClientMetadata(extra);
 *   const formattedDate = formatDateForLocale(new Date(), clientMeta.locale);
 *   // ...
 * }
 * ```
 */
export function extractClientMetadata(extra?: {
  _meta?: Record<string, unknown>;
}): ClientMetadata {
  const meta = extra?._meta;
  if (!meta) return {};

  return {
    locale: (meta["openai/locale"] as string) ?? (meta["webplus/i18n"] as string),
    userLocation: meta["openai/userLocation"] as UserLocation | undefined,
    userAgent: meta["openai/userAgent"] as UserAgentInfo | string | undefined,
    subject: meta["openai/subject"] as string | undefined,
  };
}

/**
 * Format a date using the client's preferred locale
 *
 * Falls back to "en-US" if no locale is provided.
 *
 * @example
 * ```typescript
 * const date = new Date();
 * const formatted = formatDateForLocale(date, clientMeta.locale);
 * // "December 5, 2025" (en-US) or "5. Dezember 2025" (de-DE)
 * ```
 */
export function formatDateForLocale(
  date: Date,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  try {
    return date.toLocaleDateString(locale || "en-US", options || defaultOptions);
  } catch {
    // Fall back to en-US if locale is invalid
    return date.toLocaleDateString("en-US", options || defaultOptions);
  }
}

/**
 * Format a number using the client's preferred locale
 *
 * Useful for currency, percentages, or large numbers.
 *
 * @example
 * ```typescript
 * const amount = 1234567.89;
 * const formatted = formatNumberForLocale(amount, clientMeta.locale, { style: 'currency', currency: 'USD' });
 * // "$1,234,567.89" (en-US) or "1.234.567,89 $" (de-DE)
 * ```
 */
export function formatNumberForLocale(
  number: number,
  locale?: string,
  options?: Intl.NumberFormatOptions
): string {
  try {
    return number.toLocaleString(locale || "en-US", options);
  } catch {
    return number.toLocaleString("en-US", options);
  }
}

/**
 * Get the timezone from client metadata, with fallback
 *
 * @example
 * ```typescript
 * const tz = getTimezone(clientMeta);
 * const now = new Date().toLocaleString('en-US', { timeZone: tz });
 * ```
 */
export function getTimezone(clientMeta: ClientMetadata): string {
  return clientMeta.userLocation?.timezone || "UTC";
}

/**
 * Check if the client is on a mobile device
 *
 * Useful for adjusting response format or widget behavior.
 */
export function isMobileDevice(clientMeta: ClientMetadata): boolean {
  if (typeof clientMeta.userAgent === "string") {
    return false; // Can't determine from string
  }
  return clientMeta.userAgent?.device?.type === "mobile";
}

/**
 * Check if the client supports touch input
 *
 * Useful for adjusting UI hints in responses.
 */
export function supportsTouchInput(clientMeta: ClientMetadata): boolean {
  if (typeof clientMeta.userAgent === "string") {
    return false;
  }
  return clientMeta.userAgent?.capabilities?.touch ?? false;
}
