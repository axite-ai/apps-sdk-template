"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Maximize2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useWidgetProps } from "@/src/use-widget-props";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { useTheme } from "@/src/use-theme";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";

interface HealthAccount {
  account_id: string;
  name: string;
  warnings: string[];
}

interface ToolOutput extends Record<string, unknown> {
  accounts?: HealthAccount[];
  overallStatus?: "healthy" | "warning" | "needs_attention";
  featureName?: string;
  message?: string;
  error_message?: string;
}

function getWarningIcon(warning: string) {
  const lower = warning.toLowerCase();
  if (lower.includes("low") || lower.includes("balance")) return "💰";
  if (lower.includes("overdraft")) return "⚠️";
  if (lower.includes("credit") || lower.includes("utilization")) return "💳";
  if (lower.includes("payment") || lower.includes("due")) return "📅";
  return "ℹ️";
}

function getWarningSeverity(warning: string): "error" | "warning" | "info" {
  const lower = warning.toLowerCase();
  if (lower.includes("overdraft") || lower.includes("negative")) return "error";
  if (lower.includes("high") || lower.includes("due")) return "warning";
  return "info";
}

interface WarningCardProps {
  account: HealthAccount;
  index: number;
  isDark: boolean;
}

function WarningCard({ account, index, isDark }: WarningCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: "spring",
        bounce: 0.2,
        duration: 0.6,
        delay: index * 0.05,
      }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border transition-all p-5",
        isDark
          ? "bg-gray-800 border-white/10"
          : "bg-white border-black/10",
        "shadow-[0px_2px_6px_rgba(0,0,0,0.06)]"
      )}
    >
      {/* Account Header */}
      <div className="mb-4">
        <h3
          className={cn(
            "font-medium text-base",
            isDark ? "text-white" : "text-black"
          )}
        >
          {account.name}
        </h3>
      </div>

      {/* Warnings */}
      <div className="space-y-3">
        {account.warnings.map((warning, wIndex) => {
          const severity = getWarningSeverity(warning);
          return (
            <div
              key={wIndex}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl",
                severity === "error"
                  ? isDark
                    ? "bg-red-900/20 border border-red-500/30"
                    : "bg-red-50 border border-red-200"
                  : severity === "warning"
                  ? isDark
                    ? "bg-amber-900/20 border border-amber-500/30"
                    : "bg-amber-50 border border-amber-200"
                  : isDark
                  ? "bg-blue-900/20 border border-blue-500/30"
                  : "bg-blue-50 border border-blue-200"
              )}
            >
              <div className="text-xl flex-shrink-0">
                {getWarningIcon(warning)}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm",
                    severity === "error"
                      ? isDark
                        ? "text-red-300"
                        : "text-red-900"
                      : severity === "warning"
                      ? isDark
                        ? "text-amber-300"
                        : "text-amber-900"
                      : isDark
                      ? "text-blue-300"
                      : "text-blue-900"
                  )}
                >
                  {warning}
                </p>
              </div>
              {severity === "error" ? (
                <AlertCircle
                  className={cn(
                    "w-4 h-4 flex-shrink-0",
                    isDark ? "text-red-400" : "text-red-600"
                  )}
                />
              ) : severity === "warning" ? (
                <AlertTriangle
                  className={cn(
                    "w-4 h-4 flex-shrink-0",
                    isDark ? "text-amber-400" : "text-amber-600"
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

interface HealthStatusCardProps {
  status: "healthy" | "warning" | "needs_attention";
  accountsCount: number;
  warningCount: number;
  isDark: boolean;
}

function HealthStatusCard({
  status,
  accountsCount,
  warningCount,
  isDark,
}: HealthStatusCardProps) {
  const isHealthy = status === "healthy";
  const isWarning = status === "warning";

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
      className={cn(
        "relative overflow-hidden rounded-3xl border p-6",
        isHealthy
          ? isDark
            ? "bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border-emerald-500/30"
            : "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200"
          : isWarning
          ? isDark
            ? "bg-gradient-to-br from-amber-900/30 to-amber-800/20 border-amber-500/30"
            : "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200"
          : isDark
          ? "bg-gradient-to-br from-red-900/30 to-red-800/20 border-red-500/30"
          : "bg-gradient-to-br from-red-50 to-red-100 border-red-200",
        "shadow-[0px_6px_14px_rgba(0,0,0,0.1)]"
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center",
            isHealthy
              ? "bg-emerald-500"
              : isWarning
              ? "bg-amber-500"
              : "bg-red-500"
          )}
        >
          {isHealthy ? (
            <CheckCircle2 className="w-8 h-8 text-white" />
          ) : (
            <Shield className="w-8 h-8 text-white" />
          )}
        </div>

        <div className="flex-1">
          <h2
            className={cn(
              "text-2xl font-semibold mb-1",
              isHealthy
                ? isDark
                  ? "text-emerald-300"
                  : "text-emerald-900"
                : isWarning
                ? isDark
                  ? "text-amber-300"
                  : "text-amber-900"
                : isDark
                ? "text-red-300"
                : "text-red-900"
            )}
          >
            {isHealthy
              ? "All Good!"
              : isWarning
              ? "Needs Attention"
              : "Action Required"}
          </h2>
          <p
            className={cn(
              "text-sm",
              isHealthy
                ? isDark
                  ? "text-emerald-400/80"
                  : "text-emerald-700"
                : isWarning
                ? isDark
                  ? "text-amber-400/80"
                  : "text-amber-700"
                : isDark
                ? "text-red-400/80"
                : "text-red-700"
            )}
          >
            {isHealthy
              ? `${accountsCount} accounts monitored, no issues detected`
              : `${warningCount} ${warningCount === 1 ? "issue" : "issues"} detected across ${accountsCount} ${accountsCount === 1 ? "account" : "accounts"}`}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function AccountHealth() {
  const toolOutput = useWidgetProps<ToolOutput>();
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const theme = useTheme();
  const isFullscreen = displayMode === "fullscreen";
  const isDark = theme === "dark";

  // Auth checks
  // Check for auth requirements
  const authComponent = checkWidgetAuth(toolOutput);
  if (authComponent) return authComponent;

  if (!toolOutput) {
    return (
      <div className="p-8 text-center text-black/60 dark:text-white/60">
        <p>No health data available</p>
      </div>
    );
  }

  if (!toolOutput.accounts || toolOutput.accounts.length === 0) {
    return (
      <div className="p-8 text-center text-black/60 dark:text-white/60">
        <p>No accounts to monitor</p>
      </div>
    );
  }

  const accounts = toolOutput.accounts;
  const accountsWithWarnings = accounts.filter((a) => a.warnings.length > 0);
  const totalWarnings = accounts.reduce(
    (sum, acc) => sum + acc.warnings.length,
    0
  );
  const overallStatus = toolOutput.overallStatus || "healthy";

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
      {/* Fullscreen expand button */}
      {!isFullscreen && (
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.openai) {
              window.openai.requestDisplayMode({ mode: "fullscreen" });
            }
          }}
          className={cn(
            "absolute top-4 right-4 z-20 p-2 rounded-full shadow-lg transition-all",
            isDark
              ? "bg-gray-800 text-white hover:bg-gray-700"
              : "bg-white text-black hover:bg-gray-100",
            "ring-1",
            isDark ? "ring-white/10" : "ring-black/5"
          )}
          aria-label="Expand to fullscreen"
        >
          <Maximize2 strokeWidth={1.5} className="h-4 w-4" />
        </button>
      )}

      {/* Content */}
      <div
        className={cn(
          "w-full h-full overflow-y-auto",
          isFullscreen ? "p-8" : "p-5"
        )}
      >
        {/* Header */}
        <div className="mb-6">
          <h1
            className={cn(
              "text-2xl font-semibold mb-2",
              isDark ? "text-white" : "text-black"
            )}
          >
            Account Health
          </h1>
          <div className="flex items-center gap-3">
            <TrendingUp
              className={cn(
                "w-5 h-5",
                overallStatus === "healthy"
                  ? isDark
                    ? "text-emerald-400"
                    : "text-emerald-600"
                  : isDark
                  ? "text-amber-400"
                  : "text-amber-600"
              )}
            />
            <p
              className={cn(
                "text-sm",
                isDark ? "text-white/60" : "text-black/60"
              )}
            >
              Monitor your accounts for potential issues
            </p>
          </div>
        </div>

        {/* Health Status Card */}
        <div className="mb-6">
          <HealthStatusCard
            status={overallStatus}
            accountsCount={accounts.length}
            warningCount={totalWarnings}
            isDark={isDark}
          />
        </div>

        {/* Warning Cards */}
        {accountsWithWarnings.length > 0 ? (
          <div>
            <h2
              className={cn(
                "text-lg font-medium mb-4",
                isDark ? "text-white" : "text-black"
              )}
            >
              Issues Found
            </h2>
            <div
              className={cn(
                "grid gap-4",
                isFullscreen
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1"
              )}
            >
              <AnimatePresence mode="popLayout">
                {accountsWithWarnings.map((account, index) => (
                  <WarningCard
                    key={account.account_id}
                    account={account}
                    index={index}
                    isDark={isDark}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            className={cn(
              "text-center py-12 rounded-2xl border",
              isDark
                ? "bg-gray-800 border-white/10"
                : "bg-white border-black/10"
            )}
          >
            <CheckCircle2
              className={cn(
                "w-16 h-16 mx-auto mb-4",
                isDark ? "text-emerald-400" : "text-emerald-600"
              )}
            />
            <h3
              className={cn(
                "text-lg font-medium mb-2",
                isDark ? "text-white" : "text-black"
              )}
            >
              Everything looks great!
            </h3>
            <p
              className={cn(
                "text-sm",
                isDark ? "text-white/60" : "text-black/60"
              )}
            >
              No issues detected across your accounts
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
