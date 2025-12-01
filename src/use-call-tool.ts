import { useCallback } from "react";

/**
 * Custom hook for safely calling MCP tools from widgets.
 * Wraps window.openai.callTool with error handling and type safety.
 *
 * @example
 * const callTool = useCallTool();
 * const result = await callTool("get_account_balances", {});
 */
export const useCallTool = () => {
  return useCallback(
    async <T = unknown>(toolName: string, args: Record<string, unknown> = {}): Promise<T | null> => {
      try {
        if (typeof window === "undefined" || !window.openai?.callTool) {
          console.warn("[useCallTool] callTool API not available");
          return null;
        }

        console.log(`[useCallTool] Calling tool: ${toolName}`, args);
        const result = await window.openai.callTool(toolName, args);

        if (!result || typeof result.result !== "string") {
          console.error("[useCallTool] Invalid response format", result);
          return null;
        }

        // Parse the result JSON
        const parsed = JSON.parse(result.result) as T;
        console.log(`[useCallTool] Tool ${toolName} completed successfully`, parsed);
        return parsed;
      } catch (error) {
        console.error(`[useCallTool] Error calling tool ${toolName}:`, error);
        return null;
      }
    },
    []
  );
};
