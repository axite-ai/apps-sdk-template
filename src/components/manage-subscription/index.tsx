"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Settings,
  LinkExternalWebsite,
  CreditCard,
  FileDocument,
  CloseBold,
  Expand,
} from "@openai/apps-sdk-ui/components/Icon";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { cn } from "@/lib/utils/cn";
import { useWidgetProps } from "@/src/use-widget-props";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";
import WidgetLoadingSkeleton from "@/src/components/shared/widget-loading-skeleton";

interface ManageSubscriptionProps extends Record<string, unknown> {
  billingPortalUrl?: string;
  currentPlan?: string;
  message?: string;
}

export default function ManageSubscription() {
  const toolOutput = useWidgetProps<ManageSubscriptionProps>();
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const isFullscreen = displayMode === "fullscreen";

  // Check for auth requirements
  const authComponent = checkWidgetAuth(toolOutput);
  if (authComponent) return authComponent;

  // Show loading state while waiting for tool output
  if (!toolOutput) {
    return <WidgetLoadingSkeleton />;
  }

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
      icon: FileDocument,
      text: "View billing history and invoices",
    },
  ];

  if (!billingPortalUrl) {
    return (
      <div
        className={cn(
          "antialiased w-full relative bg-surface text-default",
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
            className="rounded-2xl border p-6 shadow-sm bg-danger-soft border-danger-surface"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl flex items-center justify-center flex-shrink-0 bg-danger-surface">
                <CloseBold strokeWidth={1.5} className="h-6 w-6 text-danger" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2 text-danger">
                  Configuration Error
                </h2>
                <p className="text-sm text-danger-soft">
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
        "antialiased w-full relative bg-transparent text-default",
        !isFullscreen && "overflow-hidden"
      )}
      style={{
        maxHeight: maxHeight ?? undefined,
        height: isFullscreen ? maxHeight ?? undefined : undefined,
      }}
    >
      {/* Expand button (inline mode only) */}
      {!isFullscreen && (
        <Button
          onClick={() => window.openai?.requestDisplayMode({ mode: "fullscreen" })}
          variant="ghost"
          color="secondary"
          size="sm"
          className="absolute top-4 right-4 z-20"
          aria-label="Expand to fullscreen"
        >
          <Expand className="h-4 w-4" />
        </Button>
      )}

      {/* Content */}
      <div className={cn("w-full h-full overflow-y-auto", isFullscreen ? "p-8" : "p-0")}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="heading-lg mb-2">
            Manage Subscription
          </h1>
          <p className="text-sm text-secondary">
            Update your plan, payment methods, or billing information
          </p>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-none p-6 shadow-none bg-surface"
        >
          {/* Header with Icon */}
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-xl flex items-center justify-center flex-shrink-0 bg-discovery-solid text-white">
              <Settings strokeWidth={1.5} className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-1 text-default">
                Manage Your Subscription
              </h2>
              <p className="text-sm text-secondary">
                Update your plan, payment methods, or billing information
              </p>
            </div>
          </div>

          {/* Current Plan Badge */}
          {currentPlan && (
            <div className="mb-6 p-4 rounded-xl border bg-info-soft border-info-surface">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-info">
                  Current Plan
                </span>
                <Badge color="info" size="lg" pill>
                  {currentPlan}
                </Badge>
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
                <div className="p-2 rounded-lg flex items-center justify-center flex-shrink-0 bg-success-soft text-success">
                  <feature.icon strokeWidth={1.5} className="h-4 w-4" />
                </div>
                <p className="text-sm pt-1 text-secondary">
                  {feature.text}
                </p>
              </motion.div>
            ))}
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleManageSubscription}
            color="primary"
            size="xl"
            block
          >
            Open Billing Portal
            <LinkExternalWebsite className="ml-2 h-4 w-4" />
          </Button>

          {/* Footer Note */}
          <p className="text-xs text-center mt-4 text-tertiary">
            Secure billing portal powered by Stripe
          </p>
        </motion.div>
      </div>
    </div>
  );
}
