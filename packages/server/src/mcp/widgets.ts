/**
 * Widget Resources Registry
 *
 * Registers all widget resources that can be used by MCP tools.
 * Widgets are served from the web package.
 *
 * OpenAI Apps SDK widget metadata:
 * - openai/widgetDescription: Model-visible summary of what the widget does
 * - openai/widgetPrefersBorder: Hint to render widget in bordered card
 * - openai/widgetDomain: Custom subdomain for the widget iframe
 * - openai/widgetCSP: Content Security Policy configuration
 *
 * See: https://developers.openai.com/apps-sdk/reference
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../services/logger-service";
import type { McpContext } from "./server";

const WEB_URL = process.env.WEB_URL || "http://localhost:3000";

/**
 * Widget definitions
 */
const widgets = [
  {
    id: "user-items",
    title: "User Items List",
    description: "Display and manage your items",
    path: "/widgets/user-items",
  },
  {
    id: "manage-item",
    title: "Manage Item",
    description: "Create, update, or delete an item",
    path: "/widgets/manage-item",
  },
  {
    id: "weather",
    title: "Weather Widget",
    description: "Current weather and forecast",
    path: "/widgets/weather",
  },
  {
    id: "roi-calculator",
    title: "ROI Calculator",
    description: "Calculate investment returns",
    path: "/widgets/roi-calculator",
  },
  {
    id: "subscription-required",
    title: "Subscription Required",
    description: "Choose a plan to unlock features",
    path: "/widgets/subscription-required",
  },
  {
    id: "manage-subscription",
    title: "Manage Subscription",
    description: "Update or cancel your subscription",
    path: "/widgets/manage-subscription",
  },
  {
    id: "login",
    title: "Login",
    description: "Sign in to your account",
    path: "/login",
  },
];

/**
 * Fetch HTML from the web app for a widget
 */
async function getWidgetHtml(path: string): Promise<string> {
  const url = `${WEB_URL}${path}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch widget: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

/**
 * Register all widget resources with the MCP server
 *
 * Each widget resource includes OpenAI Apps SDK metadata for:
 * - Widget description (surfaced to model for context)
 * - Border preference (visual rendering hint)
 * - CSP configuration (security policy for network requests)
 */
export function registerWidgets(server: McpServer, _context: McpContext): void {
  for (const widget of widgets) {
    server.resource(
      `ui://widget/${widget.id}.html`,
      widget.title,
      async () => {
        try {
          const html = await getWidgetHtml(widget.path);
          return {
            contents: [
              {
                uri: `ui://widget/${widget.id}.html`,
                mimeType: "text/html+skybridge",
                text: html,
                // OpenAI Apps SDK widget metadata
                _meta: {
                  // Model-visible description - helps the model understand what this widget shows
                  "openai/widgetDescription": widget.description,
                  // Render with bordered card styling
                  "openai/widgetPrefersBorder": true,
                  // Custom domain for widget iframe (uses web app domain)
                  "openai/widgetDomain": WEB_URL,
                  // Content Security Policy for widget network requests
                  "openai/widgetCSP": {
                    // Allowed domains for fetch/XHR requests (connect-src)
                    connect_domains: [WEB_URL],
                    // Allowed domains for assets (style-src, img-src, font-src, etc.)
                    resource_domains: [WEB_URL, "https://*.oaistatic.com"],
                  },
                },
              },
            ],
          };
        } catch (error) {
          logger.error(`Failed to fetch widget: ${widget.id}`, { error });
          throw error;
        }
      }
    );
  }

  logger.info(`[Widgets] Registered ${widgets.length} widget resources`);
}
