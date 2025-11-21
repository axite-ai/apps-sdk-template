"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Shield,
  Zap,
  Building2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useWidgetProps } from "@/src/use-widget-props";
import { useOpenAiGlobal } from "@/src/use-openai-global";
import { useTheme } from "@/src/use-theme";
import { useWidgetState } from "@/src/use-widget-state";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";
import SubscriptionRequired from "@/src/components/subscription-required";
import WidgetLoadingSkeleton from "@/src/components/shared/widget-loading-skeleton";
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


interface ConnectItemUIState extends Record<string, unknown> {
  errorMessage: string | null;
}

const features = [
  { icon: Building2, text: "Banks, credit cards, investments & more" },
  { icon: Shield, text: "Bank-level encryption & security" },
  { icon: Zap, text: "Real-time balance updates" },
  { icon: TrendingUp, text: "AI-powered spending insights" },
];

export default function ConnectItem() {
  const toolOutput = useWidgetProps<WidgetProps>();
  const toolMetadata = useOpenAiGlobal("toolResponseMetadata") as ConnectItemMetadata | null;
  const theme = useTheme();
  const isDark = theme === "dark";

  const [status, setStatus] = useState<ConnectItemStatus | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uiState, setUiState] = useWidgetState<ConnectItemUIState>({
    errorMessage: null,
  });

  // Open connect page for both connecting and managing accounts
  const handleOpenConnectPage = () => {
    const mcpToken = toolMetadata?.mcpToken;
    const baseUrl = toolMetadata?.baseUrl || window.location.origin;

    console.log("[ConnectItem Widget] Opening /connect-bank with MCP token");

    if (!mcpToken) {
      console.error("[ConnectItem Widget] No MCP token in props");
      setUiState({ errorMessage: "Authentication token not available. Please try again."});
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
      setUiState({ errorMessage: "Popup blocked. Please allow popups and try again."});
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
        return (
          <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-xs font-medium", isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700")}>
            <CheckCircle className="w-3 h-3 mr-1" />
            Connected
          </span>
        );
      case "pending":
        return (
          <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-xs font-medium", isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-700")}>
            <Clock className="w-3 h-3 mr-1" />
            Connecting...
          </span>
        );
      case "error":
        return (
          <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-xs font-medium", isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700")}>
            <AlertCircle className="w-3 h-3 mr-1" />
            Action Required
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "antialiased w-full p-6 rounded-2xl border shadow-lg",
        isDark
          ? "bg-linear-to-br from-gray-800 to-gray-900 border-green-500/30 text-white"
          : "bg-linear-to-br from-gray-50 to-gray-100 border-green-300 text-black"
      )}
    >
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start">
            <div
              className={cn(
                "p-3 rounded-xl mr-4 shrink-0",
                isDark ? "bg-green-500/20" : "bg-green-100"
              )}
            >
              <CreditCard
                strokeWidth={1.5}
                className={cn("h-6 w-6", isDark ? "text-green-400" : "text-green-600")}
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Manage Financial Accounts</h2>
              <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-600")}>
                {status?.items && status.items.length > 0
                  ? `${status.planLimits.current} of ${status.planLimits.maxFormatted} accounts connected`
                  : "Connect your first financial account"}
              </p>
            </div>
          </div>
        </div>

        {/* Error Messages */}
        <AnimatePresence>
          {uiState?.errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                "mb-4 p-4 rounded-lg flex items-start",
                isDark ? "bg-red-500/20 border border-red-500/30" : "bg-red-50 border border-red-200"
              )}
            >
              <AlertCircle className={cn("w-5 h-5 mr-3 shrink-0 mt-0.5", isDark ? "text-red-400" : "text-red-600")} />
              <div className="flex-1">
                <p className={cn("text-sm font-medium", isDark ? "text-red-400" : "text-red-800")}>{uiState?.errorMessage}</p>
              </div>
              <button
                onClick={() => setUiState({ errorMessage: null })}
                className={cn("ml-2 text-sm", isDark ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-700")}
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connected Items List */}
        {status?.items && status.items.length > 0 && (
          <div className="mb-6">
            <h3 className={cn("text-sm font-semibold mb-3", isDark ? "text-gray-300" : "text-gray-700")}>
              Connected Accounts
            </h3>
            <div className="space-y-3">
              {status.items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "p-4 rounded-lg border",
                    isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div className={cn("p-2 rounded-lg mr-3", isDark ? "bg-gray-700" : "bg-gray-100")}>
                        <Building2 className={cn("w-5 h-5", isDark ? "text-gray-400" : "text-gray-600")} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{item.institutionName || "Financial Institution"}</p>
                          {getStatusBadge(item.status)}
                        </div>
                        <p className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>
                          {item.accountCount} {item.accountCount === 1 ? "account" : "accounts"} • Connected {new Date(item.connectedAt).toLocaleDateString()}
                        </p>
                        {item.status === "error" && item.errorMessage && (
                          <p className={cn("text-xs mt-1", isDark ? "text-red-400" : "text-red-600")}>
                            {item.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleOpenConnectPage}
                      className={cn(
                        "ml-4 p-2 rounded-lg transition-colors shrink-0",
                        isDark
                          ? "hover:bg-red-500/20 text-red-400"
                          : "hover:bg-red-50 text-red-600"
                      )}
                      title="Manage account"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plan Status & Actions */}
        <div className="space-y-4">
          {/* Plan Progress */}
          {status?.planLimits && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className={cn("text-sm font-medium", isDark ? "text-gray-300" : "text-gray-700")}>
                  {status.planLimits.planName.charAt(0).toUpperCase() + status.planLimits.planName.slice(1)} Plan
                </span>
                <span className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                  {status.planLimits.current} / {status.planLimits.maxFormatted}
                </span>
              </div>
              <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-gray-700" : "bg-gray-200")}>
                <div
                  className="h-full bg-linear-to-r from-green-500 to-emerald-500 transition-all duration-300"
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
              <button
                onClick={handleOpenConnectPage}
                className={cn(
                  "flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2",
                  "bg-linear-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600",
                  "shadow-lg hover:shadow-xl"
                )}
              >
                <Plus className="w-5 h-5" />
                {status.items && status.items.length > 0 ? "Connect Another Account" : "Connect Your First Account"}
              </button>
            ) : (
              <div className="flex-1 flex gap-2">
                <div
                  className={cn(
                    "flex-1 py-3 px-4 rounded-lg border text-center",
                    isDark ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-300"
                  )}
                >
                  <p className={cn("text-sm font-medium mb-1", isDark ? "text-gray-300" : "text-gray-700")}>
                    Account Limit Reached ({status.planLimits.current}/{status.planLimits.maxFormatted})
                  </p>
                  <p className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>
                    Remove an account or upgrade your plan
                  </p>
                </div>
                <a
                  href="/pricing"
                  className={cn(
                    "py-3 px-4 rounded-lg font-medium transition-all duration-200 text-center whitespace-nowrap",
                    "bg-linear-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600",
                    "shadow-lg hover:shadow-xl"
                  )}
                >
                  Upgrade Plan
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Features (show if no items connected) */}
        {status?.items && status.items.length === 0 && (
          <div className="mt-6 pt-6 border-t border-gray-700/50">
            <p className={cn("text-sm font-semibold mb-3", isDark ? "text-gray-300" : "text-gray-700")}>
              What you'll get:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <feature.icon
                    className={cn("w-4 h-4 mr-2 mt-0.5 shrink-0", isDark ? "text-green-400" : "text-green-600")}
                  />
                  <span className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-700")}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
