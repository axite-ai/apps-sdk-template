import { useOpenAiGlobal } from "./use-openai-global";

/**
 * Hook to get the maximum height constraint for the widget.
 * Useful for ensuring widgets don't exceed their container height.
 *
 * @returns The maximum height in pixels, or null if not available
 *
 * @example
 * ```tsx
 * const maxHeight = useMaxHeight();
 * return <div style={{ maxHeight, height: isFullscreen ? maxHeight : undefined }}>...</div>;
 * ```
 */
export const useMaxHeight = (): number | null => {
  return useOpenAiGlobal("maxHeight");
};
