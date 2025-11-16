import { useCallback, useEffect, useState, type SetStateAction } from "react";
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
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void];
export function useWidgetState<T extends UnknownObject>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void] {
  const widgetStateFromWindow = useOpenAiGlobal("widgetState") as T;

  const [widgetState, _setWidgetState] = useState<T | null>(() => {
    if (widgetStateFromWindow != null) {
      return widgetStateFromWindow;
    }

    return typeof defaultState === "function"
      ? defaultState()
      : defaultState ?? null;
  });

  useEffect(() => {
    _setWidgetState(widgetStateFromWindow);
  }, [widgetStateFromWindow]);

  const setWidgetState = useCallback(
    (state: SetStateAction<T | null>) => {
      _setWidgetState((prevState) => {
        const newState = typeof state === "function" ? state(prevState) : state;

        if (newState != null && typeof window !== "undefined" && window.openai) {
          window.openai.setWidgetState(newState);
        }

        return newState;
      });
    },
    []
  );

  return [widgetState, setWidgetState] as const;
}
