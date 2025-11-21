import { useCallback, type SetStateAction } from "react";
import { useOpenAiGlobal } from "./use-openai-global";
import type { UnknownObject } from "./types";

/**
 * Hook to manage persistent widget state that survives across renders.
 * Similar to useState, but state is synchronized with ChatGPT/Claude.
 *
 * @param defaultState - Default state or function returning default state
 * @returns Tuple of [state, setState] similar to useState
 *
 * @example
 * ```tsx
 * interface MyWidgetState {
 *   selectedTab: string;
 *   filters: string[];
 * }
 *
 * export default function MyWidget() {
 *   const [widgetState, setWidgetState] = useWidgetState<MyWidgetState>({
 *     selectedTab: "overview",
 *     filters: []
 *   });
 *
 *   return <div onClick={() => setWidgetState({ ...widgetState, selectedTab: "details" })} />;
 * }
 * ```
 */
export function useWidgetState<T extends UnknownObject>(
  defaultState: T | (() => T)
): readonly [T, (state: SetStateAction<T>) => void];
export function useWidgetState<T extends UnknownObject>(
  defaultState: T | (() => T)
): readonly [T, (state: SetStateAction<T>) => void] {
  const widgetState = useOpenAiGlobal("widgetState") as T | null;

  const setWidgetState = useCallback(
    (state: SetStateAction<T>) => {
      // Correctly handle functional updates, ensuring we don't pass nulls
      const currentState = (typeof window !== "undefined" ? window.openai?.widgetState : null) as T | null;
      const resolvedDefault = typeof defaultState === "function" ? (defaultState as () => T)() : defaultState;

      const newState = typeof state === "function"
        ? (state as (prevState: T) => T)(currentState ?? resolvedDefault)
        : state;

      if (newState != null && typeof window !== "undefined" && window.openai) {
        window.openai.setWidgetState(newState);
      }
    },
    [defaultState]
  );

  const resolvedState = widgetState ?? (typeof defaultState === "function" ? (defaultState as () => T)() : defaultState);

  return [resolvedState, setWidgetState] as const;
}
