import { useOpenAiGlobal } from "./use-openai-global";

/**
 * Hook to get the widget props (tool output) from ChatGPT/Claude.
 * This is the primary way to receive data from MCP tool responses.
 *
 * @param defaultState - Optional default state to use when toolOutput is not available
 * @returns The tool output data, or the default state if not available
 *
 * @example
 * ```tsx
 * interface AccountBalancesProps {
 *   accounts: Array<{ name: string; balance: number }>;
 * }
 *
 * export default function AccountBalances() {
 *   const props = useWidgetProps<AccountBalancesProps>();
 *   return <div>{props.accounts.map(...)}</div>;
 * }
 * ```
 */
export function useWidgetProps<T extends Record<string, unknown>>(
  defaultState?: T | (() => T)
): T {
  const props = useOpenAiGlobal("toolOutput") as T;

  const fallback =
    typeof defaultState === "function"
      ? (defaultState as () => T | null)()
      : defaultState ?? null;

  return props ?? fallback;
}
