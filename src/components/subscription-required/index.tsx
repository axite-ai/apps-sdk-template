"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Lock,
  Check,
  Expand,
  Sparkle,
} from "@openai/apps-sdk-ui/components/Icon";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { Alert } from "@openai/apps-sdk-ui/components/Alert";
import { AnimateLayout } from "@openai/apps-sdk-ui/components/Transition";
import { useWidgetProps } from "@/src/use-widget-props";
import { useOpenAiGlobal } from "@/src/use-openai-global";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { upgradeSubscription } from "@/app/widgets/subscription-required/actions";
import { cn } from "@/lib/utils/cn";

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
  const isFullscreen = displayMode === "fullscreen";

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
      className={`antialiased w-full relative bg-surface text-default ${!isFullscreen ? "overflow-hidden" : ""}`}
      style={{
        maxHeight: maxHeight ?? undefined,
        height: isFullscreen ? maxHeight ?? undefined : "auto",
      }}
    >
      {/* Expand button (inline mode only) */}
      {!isFullscreen && (
        <Button
          onClick={() => window.openai?.requestDisplayMode({ mode: "fullscreen" })}
          variant="ghost"
          size="sm"
          color="secondary"
          className="absolute top-4 right-4 z-20"
          aria-label="Expand to fullscreen"
        >
          <Expand className="h-4 w-4" />
        </Button>
      )}

      {/* Content */}
      <div className={`w-full h-full overflow-y-auto ${isFullscreen ? "p-8" : "p-0"}`}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-info-surface text-info">
              <Lock className="h-5 w-5" />
            </div>
            <h1 className="heading-lg">
              Choose Your Plan
            </h1>
          </div>
          <p className="text-sm text-secondary">
            Upgrade to access {String(featureName)}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4">
            <Alert
              color="danger"
              description={error}
            />
          </div>
        )}

        {/* Plan Cards */}
        <div className="space-y-3">
          {PLANS.map((plan, index) => {
            const isSelected = selectedPlan === plan.id;

            return (
              <AnimateLayout key={plan.id}>
                <div
                  key={plan.id}
                  className={cn(
                    "relative cursor-pointer rounded-2xl border-none p-4 transition-all",
                    isSelected
                      ? "bg-info-soft ring-2 ring-info"
                      : "bg-surface hover:bg-surface-secondary",
                    plan.popular && !isSelected && "border-none ring-1 ring-info"
                  )}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                      <div className="absolute -top-2 right-4">
                        <Badge color="discovery" size="sm" pill className="shadow-sm">
                          <Sparkle className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      </div>
                    )}

                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="heading-sm text-default">
                        {plan.name}
                      </h3>
                      {plan.trial && (
                        <p className="text-xs font-medium text-info">
                          {plan.trial}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-default">
                        {plan.price}
                      </div>
                      <div className="text-xs text-secondary">
                        /{plan.interval}
                      </div>
                    </div>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <div className="p-0.5 rounded-full bg-success-surface flex-shrink-0">
                          <Check
                            className="h-3 w-3 text-success"
                          />
                        </div>
                        <span className="text-secondary">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimateLayout>
            );
          })}
        </div>

        {/* Subscribe Button */}
        <AnimateLayout>
          <div key="subscribe-button" className="mt-6">
            <Button
              id="subscribe-btn"
              disabled={!selectedPlan || isLoading}
              loading={isLoading}
              onClick={handleSubscribe}
              color="primary"
              size="xl"
              block
            >
              {isLoading ? "Opening Stripe..." : selectedPlan ? `Subscribe to ${PLANS.find((p) => p.id === selectedPlan)?.name}` : "Select a plan to continue"}
            </Button>
          </div>
        </AnimateLayout>

        {/* Footer */}
        <p className="text-xs text-center mt-4 text-tertiary">
          Secure checkout powered by Stripe
        </p>
      </div>
    </div>
  );
}
