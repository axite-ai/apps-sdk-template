"use client";

import React from "react";
import { motion } from "framer-motion";
import { Settings, ExternalLink, CreditCard, FileText, X, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useWidgetProps } from "@/src/use-widget-props";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { useTheme } from "@/src/use-theme";

interface ManageSubscriptionProps extends Record<string, unknown> {
  billingPortalUrl?: string;
  currentPlan?: string;
  message?: string;
}

export default function ManageSubscription() {
  const toolOutput = useWidgetProps<ManageSubscriptionProps>();
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const theme = useTheme();
  const isFullscreen = displayMode === "fullscreen";
  const isDark = theme === "dark";

  const billingPortalUrl = toolOutput?.billingPortalUrl;
  const currentPlan = toolOutput?.currentPlan;

  const handleManageSubscription = () => {
    if (!billingPortalUrl) {
      return;
    }

    // Check if we're in ChatGPT/Claude context
    if (typeof window !== "undefined" && window.openai?.openExternal) {
      // In ChatGPT iframe - use openExternal
      window.openai.openExternal({ href: billingPortalUrl });
    } else {
      // Regular browser - use window.open
      window.open(billingPortalUrl, "_blank", "noopener,noreferrer");
    }
  };

  const features = [
    {
      icon: CreditCard,
      text: "View and update your payment methods",
    },
    {
      icon: Settings,
      text: "Change or cancel your subscription",
    },
    {
      icon: FileText,
      text: "View billing history and invoices",
    },
  ];

  if (!billingPortalUrl) {
    return (
      <div
        className={cn(
          "antialiased w-full relative",
          isDark ? "bg-gray-900" : "bg-gray-50",
          !isFullscreen && "overflow-hidden"
        )}
        style={{
          maxHeight: maxHeight ?? undefined,
          height: isFullscreen ? maxHeight ?? undefined : undefined,
        }}
      >
        <div className={cn("w-full h-full overflow-y-auto", isFullscreen ? "p-8" : "p-5")}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-2xl border p-6 shadow-[0px_2px_6px_rgba(0,0,0,0.06)]",
              isDark
                ? "bg-gradient-to-br from-red-500/20 to-rose-500/20 border-red-500/20"
                : "bg-gradient-to-br from-red-50 to-rose-50 border-red-200"
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "p-3 rounded-xl flex items-center justify-center flex-shrink-0",
                  isDark ? "bg-red-500/30" : "bg-red-100"
                )}
              >
                <X strokeWidth={1.5} className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className={cn("text-xl font-semibold mb-2", isDark ? "text-red-300" : "text-red-900")}>
                  Configuration Error
                </h2>
                <p className={cn("text-sm", isDark ? "text-red-400/80" : "text-red-700")}>
                  Billing portal is not configured. Please contact support for assistance.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "antialiased w-full relative",
        isDark ? "bg-gray-900" : "bg-gray-50",
        !isFullscreen && "overflow-hidden"
      )}
      style={{
        maxHeight: maxHeight ?? undefined,
        height: isFullscreen ? maxHeight ?? undefined : undefined,
      }}
    >
      {/* Expand button (inline mode only) */}
      {!isFullscreen && (
        <button
          onClick={() => window.openai?.requestDisplayMode({ mode: "fullscreen" })}
          className={cn(
            "absolute top-4 right-4 z-20 p-2 rounded-full shadow-lg transition-all ring-1",
            isDark
              ? "bg-gray-800 text-white hover:bg-gray-700 ring-white/10"
              : "bg-white text-black hover:bg-gray-100 ring-black/5"
          )}
          aria-label="Expand to fullscreen"
        >
          <Maximize2 strokeWidth={1.5} className="h-4 w-4" />
        </button>
      )}

      {/* Content */}
      <div className={cn("w-full h-full overflow-y-auto", isFullscreen ? "p-8" : "p-5")}>
        {/* Header */}
        <div className="mb-6">
          <h1 className={cn("text-2xl font-semibold mb-2", isDark ? "text-white" : "text-black")}>
            Manage Subscription
          </h1>
          <p className={cn("text-sm", isDark ? "text-white/60" : "text-black/60")}>
            Update your plan, payment methods, or billing information
          </p>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-2xl border p-6 shadow-[0px_2px_6px_rgba(0,0,0,0.06)]",
            isDark ? "bg-gray-800 border-white/10" : "bg-white border-black/5"
          )}
        >
          {/* Header with Icon */}
          <div className="flex items-start gap-4 mb-6">
            <div
              className={cn(
                "p-3 rounded-xl flex items-center justify-center flex-shrink-0",
                "bg-gradient-to-br from-blue-500 to-purple-500"
              )}
            >
              <Settings strokeWidth={1.5} className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className={cn("text-xl font-semibold mb-1", isDark ? "text-white" : "text-black")}>
                Manage Your Subscription
              </h2>
              <p className={cn("text-sm", isDark ? "text-white/60" : "text-black/60")}>
                Update your plan, payment methods, or billing information
              </p>
            </div>
          </div>

          {/* Current Plan Badge */}
          {currentPlan && (
            <div
              className={cn(
                "mb-6 p-4 rounded-xl border",
                isDark ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-sm font-medium", isDark ? "text-blue-300" : "text-blue-900")}>
                  Current Plan
                </span>
                <span
                  className={cn(
                    "text-base font-bold capitalize px-3 py-1 rounded-full",
                    isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-900"
                  )}
                >
                  {currentPlan}
                </span>
              </div>
            </div>
          )}

          {/* Features List */}
          <div className="mb-6 space-y-3">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3"
              >
                <div
                  className={cn(
                    "p-2 rounded-lg flex items-center justify-center flex-shrink-0",
                    isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600"
                  )}
                >
                  <feature.icon strokeWidth={1.5} className="h-4 w-4" />
                </div>
                <p className={cn("text-sm pt-1", isDark ? "text-white/70" : "text-black/70")}>
                  {feature.text}
                </p>
              </motion.div>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={handleManageSubscription}
            className={cn(
              "w-full rounded-xl px-6 py-3 font-semibold text-white transition-all",
              "bg-gradient-to-r from-blue-500 to-purple-500",
              "hover:from-blue-600 hover:to-purple-600",
              "shadow-lg hover:shadow-xl",
              "flex items-center justify-center gap-2"
            )}
          >
            <span>Open Billing Portal</span>
            <ExternalLink strokeWidth={1.5} className="h-4 w-4" />
          </button>

          {/* Footer Note */}
          <p className={cn("text-xs text-center mt-4", isDark ? "text-white/40" : "text-black/40")}>
            Secure billing portal powered by Stripe
          </p>
        </motion.div>
      </div>
    </div>
  );
}
