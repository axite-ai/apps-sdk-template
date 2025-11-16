"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/src/use-theme";

export default function TestWidget() {
  const theme = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="p-5 antialiased">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        className={cn(
          "rounded-3xl border p-8 text-center",
          isDark
            ? "bg-gray-800 border-white/10"
            : "bg-white border-black/10",
          "shadow-[0px_6px_14px_rgba(0,0,0,0.1)]"
        )}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: 360 }}
          transition={{
            type: "spring",
            bounce: 0.4,
            duration: 1,
            delay: 0.2,
          }}
          className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center"
        >
          <Sparkles className="w-10 h-10 text-white" />
        </motion.div>

        <h1
          className={cn(
            "text-2xl font-semibold mb-2",
            isDark ? "text-white" : "text-black"
          )}
        >
          Test Widget
        </h1>

        <p
          className={cn(
            "text-sm mb-6",
            isDark ? "text-white/60" : "text-black/60"
          )}
        >
          This is a test widget demonstrating the new design system
        </p>

        <div className="space-y-3">
          {["Adaptive theme support", "Smooth animations", "Modern design"].map(
            (feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  type: "spring",
                  bounce: 0.2,
                  duration: 0.5,
                  delay: index * 0.1 + 0.4,
                }}
                className="flex items-center justify-center gap-2"
              >
                <CheckCircle2
                  className={cn(
                    "w-4 h-4",
                    isDark ? "text-emerald-400" : "text-emerald-600"
                  )}
                />
                <span
                  className={cn(
                    "text-sm",
                    isDark ? "text-white/70" : "text-black/70"
                  )}
                >
                  {feature}
                </span>
              </motion.div>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
}
