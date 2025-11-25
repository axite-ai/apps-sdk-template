"use client";

import { useEffect } from "react";
import { useTheme } from "@/src/use-theme";
import { applyDocumentTheme } from "@openai/apps-sdk-ui/theme";

export function ThemeSync() {
  const theme = useTheme();

  useEffect(() => {
    if (theme) {
      applyDocumentTheme(theme);
    }
  }, [theme]);

  return null;
}
