"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { SET_GLOBALS_EVENT_TYPE } from "@/src/types";

interface PreviewWrapperProps {
  children: React.ReactNode;
  data: any;
  metadata?: any;
  title: string;
}

/**
 * useSyncExternalStore pattern for SSR-safe "mounted" detection.
 *
 * - subscribe: No-op because we don't need to listen for changes (mounted is static after first render)
 * - getSnapshot: Returns `true` on client - component is mounted
 * - getServerSnapshot: Returns `false` on server - prevents hydration mismatch
 *
 * This avoids the lint error from calling setState in useEffect while still
 * providing SSR-safe mounting detection without hydration mismatches.
 */
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function PreviewWrapper({ children, data, metadata, title }: PreviewWrapperProps) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Inject mock data into window.openai
    if (typeof window !== "undefined") {
      // Mock setWidgetState to allow local state updates
      const setWidgetState = async (newState: any) => {
        window.openai.widgetState = newState;
        window.dispatchEvent(
          new CustomEvent(SET_GLOBALS_EVENT_TYPE, {
            detail: {
              globals: {
                widgetState: newState,
              },
            },
          })
        );
      };

      window.openai = {
        ...window.openai,
        toolOutput: data,
        toolResponseMetadata: metadata,
        widgetState: null, // Reset state when data changes
        setWidgetState: setWidgetState as any, // Cast to any to match API signature
        requestDisplayMode: async ({ mode }: { mode: any }) => {
          console.log("Mock requestDisplayMode:", mode);
          return { mode };
        },
        theme: theme,
      };

      // Dispatch event to notify hooks
      window.dispatchEvent(
        new CustomEvent(SET_GLOBALS_EVENT_TYPE, {
          detail: {
            globals: {
              toolOutput: data,
              toolResponseMetadata: metadata,
              widgetState: null,
              theme: theme,
            },
          },
        })
      );

      // Sync theme with document element
      // Apps SDK UI uses data-theme attribute for theme switching
      document.documentElement.setAttribute("data-theme", theme);
      // Also toggle class for Tailwind if configured to use class strategy (though data-theme is preferred)
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [data, metadata, theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  if (!mounted) return null;

  return (
    <div className="border-none rounded-xl overflow-hidden bg-transparent mb-8">
      <div className="bg-transparent px-4 py-2 border-none text-sm font-medium text-secondary flex justify-between items-center">
        <span>{title}</span>
        <button
          onClick={toggleTheme}
          className="px-3 py-1 text-xs font-semibold bg-surface border border-default rounded-md hover:bg-surface-secondary transition-colors"
        >
          {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
        </button>
      </div>
      <div className="p-0 relative min-h-[200px]">
        {children}
      </div>
    </div>
  );
}
