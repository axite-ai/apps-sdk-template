"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Check, Maximize2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useWidgetProps } from "@/src/use-widget-props";
import { useOpenAiGlobal } from "@/src/use-openai-global";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { useTheme } from "@/src/use-theme";
import { upgradeSubscription } from "@/app/widgets/subscription-required/actions";

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: "$9.99",
    interval: "month",
    features: [
      "Up to 3 financial accounts",
      "Transaction history",
      "Spending insights",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19.99",
    interval: "month",
    popular: true,
    trial: "14-day free trial",
    features: [
      "Up to 10 financial accounts",
      "All Basic features",
      "Account health monitoring",
      "Advanced analytics",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$49.99",
    interval: "month",
    features: [
      "Unlimited financial accounts",
      "All Pro features",
      "Custom reporting",
      "API access",
      "Dedicated support",
    ],
  },
];

interface SubscriptionRequiredProps extends Record<string, unknown> {
  featureName?: string;
  error_message?: string;
  pricingUrl?: string;
}

interface SubscriptionRequiredMetadata {
  userId?: string;
}

export default function SubscriptionRequired() {
  const toolOutput = useWidgetProps<SubscriptionRequiredProps>();
  const toolMetadata = useOpenAiGlobal("toolResponseMetadata") as SubscriptionRequiredMetadata | null;
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const theme = useTheme();
  const isFullscreen = displayMode === "fullscreen";
  const isDark = theme === "dark";

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const featureName = toolOutput?.featureName || "this feature";
  const userId = toolMetadata?.userId;


  const handleSelectPlan = (planId: string) => {
    if (isLoading) return;
    setSelectedPlan(planId);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || isLoading) return;

    if (!userId) {
      setError("Authentication error. Please refresh and try again.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await upgradeSubscription(userId, selectedPlan);

      if (!result.success) {
        throw new Error(result.error || "Failed to create checkout session");
      }

      if (!result.checkoutUrl) {
        throw new Error("No checkout URL returned from server");
      }

      // Redirect to Stripe (button stays disabled)
      if (typeof window !== "undefined" && window.openai?.openExternal) {
        window.openai.openExternal({ href: result.checkoutUrl });
      } else {
        window.location.href = result.checkoutUrl;
      }

      // Note: Button stays disabled after redirect. User will close the Stripe page
      // and retry their original request in ChatGPT, which will now work.
    } catch (error: unknown) {
      console.error("Subscription error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to start subscription. Please try again."
      );
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "antialiased w-full relative",
        isDark ? "bg-gray-900" : "bg-gray-50",
        !isFullscreen && "overflow-hidden"
      )}
      style={{
        maxHeight: maxHeight ?? undefined,
        height: isFullscreen ? maxHeight ?? undefined : "auto",
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
          <div className="flex items-center gap-2 mb-2">
            <Lock strokeWidth={1.5} className={cn("h-5 w-5", isDark ? "text-blue-400" : "text-blue-600")} />
            <h1 className={cn("text-2xl font-semibold", isDark ? "text-white" : "text-black")}>
              Choose Your Plan
            </h1>
          </div>
          <p className={cn("text-sm", isDark ? "text-white/60" : "text-black/60")}>
            Upgrade to access {String(featureName)}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mb-4 p-3 rounded-xl border text-sm",
              isDark
                ? "bg-red-500/20 border-red-500/30 text-red-300"
                : "bg-red-50 border-red-200 text-red-700"
            )}
          >
            {error}
          </motion.div>
        )}

        {/* Plan Cards */}
        <div className="space-y-3">
          {PLANS.map((plan, index) => {
            const isSelected = selectedPlan === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "relative cursor-pointer rounded-2xl border p-4 transition-all shadow-[0px_2px_6px_rgba(0,0,0,0.06)]",
                  isSelected
                    ? isDark
                      ? "bg-blue-500/10 border-blue-500/30 ring-2 ring-blue-500/50"
                      : "bg-blue-50 border-blue-300 ring-2 ring-blue-400/50"
                    : isDark
                    ? "bg-gray-800 border-white/10 hover:bg-gray-750"
                    : "bg-white border-black/5 hover:bg-gray-50",
                  plan.popular && "border-blue-500/50"
                )}
                onClick={() => handleSelectPlan(plan.id)}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-2 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold flex items-center gap-1 shadow-lg">
                    <Sparkles strokeWidth={1.5} className="h-3 w-3" />
                    Popular
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-black")}>
                      {plan.name}
                    </h3>
                    {plan.trial && (
                      <p className={cn("text-xs font-medium", isDark ? "text-blue-400" : "text-blue-600")}>
                        {plan.trial}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={cn("text-2xl font-bold", isDark ? "text-white" : "text-black")}>
                      {plan.price}
                    </div>
                    <div className={cn("text-xs", isDark ? "text-white/60" : "text-black/60")}>
                      /{plan.interval}
                    </div>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <div
                        className={cn(
                          "p-0.5 rounded-full flex-shrink-0",
                          isDark ? "bg-green-500/20" : "bg-green-100"
                        )}
                      >
                        <Check
                          strokeWidth={2}
                          className={cn(
                            "h-3 w-3",
                            isDark ? "text-green-400" : "text-green-600"
                          )}
                        />
                      </div>
                      <span className={cn(isDark ? "text-white/80" : "text-black/80")}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Subscribe Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          id="subscribe-btn"
          disabled={!selectedPlan || isLoading}
          onClick={handleSubscribe}
          className={cn(
            "w-full mt-6 rounded-xl px-6 py-3.5 font-semibold text-white transition-all shadow-lg",
            "bg-gradient-to-r from-blue-500 to-purple-500",
            "hover:from-blue-600 hover:to-purple-600 hover:shadow-xl",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg",
            "flex items-center justify-center gap-2"
          )}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Opening Stripe...
            </>
          ) : selectedPlan ? (
            <>Subscribe to {PLANS.find((p) => p.id === selectedPlan)?.name}</>
          ) : (
            <>Select a plan to continue</>
          )}
        </motion.button>

        {/* Footer */}
        <p className={cn("text-xs text-center mt-4", isDark ? "text-white/40" : "text-black/40")}>
          Secure checkout powered by Stripe
        </p>
      </div>
    </div>
  );
}