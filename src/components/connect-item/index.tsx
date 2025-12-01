"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Plus,
  Clock,
  Trending,
  ShieldCheck,
  Flash,
  Business,
  Trash,
  Expand,
} from "@openai/apps-sdk-ui/components/Icon";
import { Button, ButtonLink } from "@openai/apps-sdk-ui/components/Button";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { Alert } from "@openai/apps-sdk-ui/components/Alert";
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { AnimateLayout } from "@openai/apps-sdk-ui/components/Transition";
import { useWidgetProps } from "@/src/use-widget-props";
import { useOpenAiGlobal } from "@/src/use-openai-global";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";
import SubscriptionRequired from "@/src/components/subscription-required";
import { WidgetLoadingSkeleton } from "@/src/components/shared/widget-loading-skeleton";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import {
  type ConnectedItem,
  type ConnectItemStatus,
} from "@/app/widgets/connect-item/actions";

// Data from structuredContent (visible to model)
interface WidgetProps extends Record<string, unknown> {
  planLimits?: {
    current: number;
    max: number;
    maxFormatted: string;
    planName: string;
  };
  canConnect?: boolean;
  // Auth error fields (checked by checkWidgetAuth)
  message?: string;
  error_message?: string;
  featureName?: string;
}

// Data from _meta (widget only)
interface ConnectItemMetadata extends Record<string, unknown> {
  items: ConnectedItem[];
  baseUrl?: string;
  mcpToken?: string;
}

const features = [
  { icon: Business, text: "Banks, credit cards, investments & more" },
  { icon: ShieldCheck, text: "Bank-level encryption & security" },
  { icon: Flash, text: "Real-time balance updates" },
  { icon: Trending, text: "AI-powered spending insights" },
];

export default function ConnectItem() {
  const toolOutput = useWidgetProps<WidgetProps>();
  const toolMetadata = useOpenAiGlobal("toolResponseMetadata") as ConnectItemMetadata | null;
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const isFullscreen = displayMode === "fullscreen";

  const [status, setStatus] = useState<ConnectItemStatus | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Open connect page for both connecting and managing accounts
  const handleOpenConnectPage = () => {
    const mcpToken = toolMetadata?.mcpToken;
    const baseUrl = toolMetadata?.baseUrl || window.location.origin;

    console.log("[ConnectItem Widget] Opening /connect-bank with MCP token");

    if (!mcpToken) {
      console.error("[ConnectItem Widget] No MCP token in props");
      setErrorMessage("Authentication token not available. Please try again.");
      return;
    }

    const connectUrl = `${baseUrl}/connect-bank?token=${encodeURIComponent(mcpToken)}`;

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      connectUrl,
      "plaid-connect",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup || popup.closed) {
      console.error("[ConnectItem Widget] Popup blocked");
      setErrorMessage("Popup blocked. Please allow popups and try again.");
    } else {
      console.log("[ConnectItem Widget] Popup opened successfully");
    }
  };

  // Load status from props (MCP tool response only)
  useEffect(() => {
    // First, check for auth errors passed in props from a failed tool call.
    // This is the only time we trust the props for auth status.
    const authComponent = checkWidgetAuth(toolOutput);
    if (authComponent) {
      setAuthError("Subscription required");
      setLoading(false);
      return;
    }

    const items = toolMetadata?.items;
    const planLimits = toolOutput?.planLimits;

    if (items && planLimits) {
      // Status provided in props (tool was called successfully)
      setStatus({
        items: items,
        planLimits: planLimits,
        deletionStatus: { canDelete: true },
        canConnect: toolOutput?.canConnect ?? true,
      });
      setLoading(false);
    } else {
      // No props yet - still loading from MCP tool call
      // Don't call server actions - they fail auth in ChatGPT iframe
      setLoading(true);
    }
  }, [toolOutput, toolMetadata]);

  // Show loading skeleton while fetching
  if (loading) {
    return <WidgetLoadingSkeleton />;
  }

  // Show subscription required if auth error from server action OR from initial props
  if (authError) {
    return <SubscriptionRequired />;
  }

  const getStatusBadge = (itemStatus: string | null) => {
    switch (itemStatus) {
      case "active":
        return <Badge color="success">Connected</Badge>;
      case "pending":
        return (
          <Badge color="warning">
            <Clock className="w-3 h-3 mr-1" />
            Connecting...
          </Badge>
        );
      case "error":
        return <Badge color="danger">Action Required</Badge>;
      default:
        return null;
    }
  };

  // Render minimal inline version (400px height optimization)
  if (!isFullscreen) {
    return (
      <div
        className="antialiased w-full relative flex flex-col h-full min-h-[400px] p-6 text-default bg-transparent"
        style={{ height: "400px" }}
      >
        {/* Fullscreen toggle */}
        <Button
          onClick={() => {
            if (typeof window !== "undefined" && window.openai) {
              window.openai.requestDisplayMode({ mode: "fullscreen" });
            }
          }}
          variant="ghost"
          color="secondary"
          size="sm"
          className="absolute top-4 right-4 z-20"
          aria-label="Expand to fullscreen"
        >
          <Expand className="h-4 w-4" />
        </Button>

        {/* Compact Header */}
        <div className="flex flex-col items-center text-center mb-8 mt-4">
          <div className="p-4 rounded-2xl bg-surface-secondary text-secondary mb-4">
            <CreditCard className="h-8 w-8" />
          </div>
          <h2 className="heading-lg mb-2">Manage Accounts</h2>
          <p className="text-secondary text-md max-w-xs">
            {status?.items && status.items.length > 0
              ? `${status.planLimits.current} of ${status.planLimits.maxFormatted} accounts connected`
              : "Connect your first financial account"}
          </p>
        </div>

        {/* Primary Action */}
        <div className="mt-auto">
          <Button
            color="primary"
            size="xl"
            onClick={handleOpenConnectPage}
            className="w-full"
          >
            <Plus className="mr-2" />
            {status?.items && status.items.length > 0 ? "Connect Account" : "Connect First Account"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="antialiased w-full relative bg-transparent text-default p-8"
      style={{
        maxHeight: maxHeight ?? undefined,
        height: maxHeight ?? undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-surface-secondary text-secondary">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h2 className="heading-lg mb-1">Manage Financial Accounts</h2>
            <p className="text-secondary text-sm">
              {status?.items && status.items.length > 0
                ? `${status.planLimits.current} of ${status.planLimits.maxFormatted} accounts connected`
                : "Connect your first financial account"}
            </p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {errorMessage && (
        <div className="mb-6">
          <Alert
            color="danger"
            description={errorMessage}
            actions={
              <Button size="sm" variant="soft" color="danger" onClick={() => setErrorMessage(null)}>
                Dismiss
              </Button>
            }
          />
        </div>
      )}

      {/* Connected Items List */}
      {status?.items && status.items.length > 0 ? (
        <div className="mb-8">
          <h3 className="text-sm font-semibold mb-3 text-secondary">
            Connected Accounts
          </h3>
          <div className="space-y-3">
            {status.items.map((item) => (
              <AnimateLayout>
                <div
                  key={item.id}
                  className="p-4 rounded-lg border border-subtle bg-surface hover:border-default transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 gap-3">
                      <div className="p-2 rounded-lg bg-surface-secondary text-secondary">
                        <Business className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{item.institutionName || "Financial Institution"}</p>
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-xs text-secondary">
                          {item.accountCount} {item.accountCount === 1 ? "account" : "accounts"} • Connected {new Date(item.connectedAt).toLocaleDateString()}
                        </p>
                        {item.status === "error" && item.errorMessage && (
                          <p className="text-xs mt-1 text-danger">
                            {item.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      color="danger"
                      size="sm"
                      onClick={handleOpenConnectPage}
                      className="shrink-0"
                    >
                      <Trash className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </AnimateLayout>
            ))}
          </div>
        </div>
      ) : (
        <EmptyMessage className="mb-8">
          <EmptyMessage.Icon color="secondary">
            <CreditCard />
          </EmptyMessage.Icon>
          <EmptyMessage.Title>No accounts connected</EmptyMessage.Title>
          <EmptyMessage.Description>Connect your first financial account to get started</EmptyMessage.Description>
        </EmptyMessage>
      )}

      {/* Plan Status & Actions */}
      <div className="space-y-6">
        {/* Plan Progress */}
        {status?.planLimits && (
          <div className="p-4 rounded-xl bg-surface-secondary border border-subtle">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium text-default">
                {status.planLimits.planName.charAt(0).toUpperCase() + status.planLimits.planName.slice(1)} Plan
              </span>
              <span className="text-sm text-secondary">
                {status.planLimits.current} / {status.planLimits.maxFormatted} accounts
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-surface-tertiary">
              <div
                className="h-full bg-success transition-all duration-300"
                style={{
                  width: `${Math.min((status.planLimits.current / status.planLimits.max) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {status?.canConnect ? (
            <Button
              color="primary"
              size="lg"
              onClick={handleOpenConnectPage}
              className="flex-1 h-12"
            >
              <Plus className="mr-2" />
              {status.items && status.items.length > 0 ? "Connect Another Account" : "Connect Your First Account"}
            </Button>
          ) : (
            <div className="flex-1 flex gap-4 items-center p-4 rounded-xl border border-warning bg-surface-secondary">
              <div className="flex-1">
                <p className="font-semibold text-warning mb-1">
                  Account Limit Reached
                </p>
                <p className="text-sm text-secondary">
                  Remove an account or upgrade your plan to connect more.
                </p>
              </div>
              <ButtonLink
                href="/pricing"
                color="primary"
                size="md"
              >
                Upgrade Plan
              </ButtonLink>
            </div>
          )}
        </div>
      </div>

      {/* Features (show if no items connected) */}
      {status?.items?.length === 0 && (
        <div className="mt-8 pt-8 border-t border-subtle">
          <p className="font-semibold mb-4 text-default">
            What you'll get:
          </p>
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="p-1 rounded bg-success-surface shrink-0 mt-0.5">
                  <feature.icon className="w-4 h-4 text-success" />
                </div>
                <span className="text-sm text-secondary leading-snug">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
