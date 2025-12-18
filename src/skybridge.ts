/**
 * Skybridge hooks with type inference from AppType
 *
 * This is the single source of truth for all Skybridge hooks.
 * Widgets should always import from "@/src/skybridge", not "skybridge/web" directly.
 */
import {
  generateHelpers,
  useToolInfo,
  useWidgetState,
  useTheme,
  useDisplayMode,
  useSendFollowUpMessage,
} from "skybridge/web";
import type { AppType } from "@/app/[transport]/route";

// Generate typed hooks from AppType (enables autocomplete for tool names)
export const { useCallTool } = generateHelpers<AppType>();

// Re-export Skybridge hooks directly - they have their own typing
export { useToolInfo, useWidgetState, useTheme, useDisplayMode, useSendFollowUpMessage };
