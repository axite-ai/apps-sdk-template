import { useOpenAiGlobal } from "./use-openai-global";
import { type DisplayMode } from "./types";

/**
 * Hook to get the current display mode of the widget.
 *
 * @returns The current display mode: "inline", "pip", or "fullscreen", or null if not available
 *
 * @example
 * ```tsx
 * const displayMode = useDisplayMode();
 * const isFullscreen = displayMode === "fullscreen";
 * ```
 */
export const useDisplayMode = (): DisplayMode | null => {
  return useOpenAiGlobal("displayMode");
};
