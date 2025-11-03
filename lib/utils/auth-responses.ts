/**
 * Authentication Response Builders
 *
 * Helper functions to create standardized responses when authentication is required.
 * These responses include the login widget to allow users to authenticate inline.
 */

import type { OpenAIResponseMetadata } from "../types";
import { baseURL } from "@/baseUrl";

/**
 * Create a response that prompts the user to authenticate
 *
 * This response includes a reference to the login widget, allowing users
 * to authenticate without leaving ChatGPT.
 *
 * @param featureName - Optional name of the feature requiring authentication
 * @returns MCP tool response with login widget reference
 */
export function createLoginPromptResponse(featureName?: string) {
  const baseMessage = featureName
    ? `To access ${featureName}, please sign in to your AskMyMoney account.`
    : "This feature requires authentication. Please sign in to your AskMyMoney account.";

  const responseMeta: OpenAIResponseMetadata = {
    "openai/toolInvocation/invoking": "Checking authentication",
    "openai/toolInvocation/invoked": "Authentication required",
    "openai/outputTemplate": "ui://widget/login.html",
    "openai/widgetAccessible": false, // Login widget should not call tools
    "openai/resultCanProduceWidget": true, // This response produces a widget
  };

  return {
    content: [
      {
        type: "text" as const,
        text: baseMessage,
      } as { [x: string]: unknown; type: "text"; text: string },
    ],
    // Don't include structuredContent - would conflict with tool's outputSchema validation
    isError: false, // Not an error - just requires auth
    _meta: responseMeta,
  };
}

/**
 * Create a response prompting the user to subscribe
 *
 * @param featureName - Optional name of the feature requiring subscription
 * @returns MCP tool response with subscription-required widget reference
 */
export function createSubscriptionRequiredResponse(featureName?: string) {
  const baseMessage = featureName
    ? `To access ${featureName}, please subscribe to a plan.`
    : "This feature requires a subscription. Please choose a plan.";

  const responseMeta: OpenAIResponseMetadata = {
    "openai/toolInvocation/invoking": "Checking subscription",
    "openai/toolInvocation/invoked": "Subscription required",
    "openai/outputTemplate": "ui://widget/subscription-required.html",
    "openai/widgetAccessible": false,
    "openai/resultCanProduceWidget": true,
  };

  return {
    content: [
      {
        type: "text" as const,
        text: baseMessage,
      } as { [x: string]: unknown; type: "text"; text: string },
    ],
    // Include structured content so widget can access feature name and pricing URL
    structuredContent: {
      featureName: featureName || "this feature",
      error_message: "Subscription required",
      pricingUrl: `${baseURL}/pricing`,
    },
    isError: false,
    _meta: responseMeta,
  };
}

/**
 * Create a response prompting the user to connect their bank via Plaid Link
 *
 * @returns MCP tool response with Plaid connection widget
 */
export function createPlaidRequiredResponse() {
  const baseMessage = "Please connect your bank account to access your financial data.";

  const responseMeta: OpenAIResponseMetadata = {
    "openai/toolInvocation/invoking": "Checking bank connection",
    "openai/toolInvocation/invoked": "Bank connection required",
    "openai/outputTemplate": "ui://widget/plaid-required.html",
    "openai/widgetAccessible": false,
    "openai/resultCanProduceWidget": true,
  };

  return {
    content: [
      {
        type: "text" as const,
        text: baseMessage,
      } as { [x: string]: unknown; type: "text"; text: string },
    ],
    // Include structured content so widget can access baseUrl
    structuredContent: {
      baseUrl: baseURL,
      message: "Bank connection required",
    },
    isError: false,
    _meta: responseMeta,
  };
}
