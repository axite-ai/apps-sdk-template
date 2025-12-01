"use client";

import React from "react";
import {
  Expand,
  Error,
  CheckCircleFilled,
  Warning,
  Trending,
  ShieldCheck,
} from "@openai/apps-sdk-ui/components/Icon";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { AnimateLayout } from "@openai/apps-sdk-ui/components/Transition";
import { cn } from "@/lib/utils/cn";
import { useWidgetProps } from "@/src/use-widget-props";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";
import { WidgetLoadingSkeleton } from "@/src/components/shared/widget-loading-skeleton";

interface HealthAccount {
  account_id: string;
  accountName: string;
  warnings: string[];
}

interface ToolOutput extends Record<string, unknown> {
  accounts?: HealthAccount[];
  overallStatus?: "healthy" | "warning" | "needs_attention" | "attention_needed";
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
}

function WarningCard({ account, index }: WarningCardProps) {
  return (
    <AnimateLayout>
      <div
        key={"account-warning-card-" + index}
        className="group relative overflow-hidden rounded-2xl border border-subtle transition-all p-5 bg-surface shadow-hairline"
      >
        {/* Account Header */}
        <div className="mb-4">
          <h3 className="font-medium text-base text-default">{account.accountName}</h3>
        </div>

        {/* Warnings */}
        <div className="space-y-3">
          {account.warnings.map((warning, wIndex) => {
            const severity = getWarningSeverity(warning);
            return (
              <div
                key={wIndex}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border",
                  severity === "error"
                    ? "bg-danger-soft border-danger-surface"
                    : severity === "warning"
                    ? "bg-warning-soft border-warning-surface"
                    : "bg-info-soft border-info-surface"
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
                        ? "text-danger"
                        : severity === "warning"
                        ? "text-warning"
                        : "text-info"
                    )}
                  >
                    {warning}
                  </p>
                </div>
                {severity === "error" ? (
                  <Error className="w-4 h-4 shrink-0 text-danger" />
                ) : severity === "warning" ? (
                  <Warning className="w-4 h-4 shrink-0 text-warning" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </AnimateLayout>
  );
}

interface HealthStatusCardProps {
  status: "healthy" | "warning" | "needs_attention" | "attention_needed";
  accountsCount: number;
  warningCount: number;
}

function HealthStatusCard({
  status,
  accountsCount,
  warningCount,
}: HealthStatusCardProps) {
  const isHealthy = status === "healthy";
  const isWarning = status === "warning";

  return (
    <AnimateLayout>
      <div
        key="health-status-card"
        className={cn(
          "relative overflow-hidden rounded-3xl border-none p-6 shadow-hairline",
          isHealthy
            ? "bg-success-soft"
            : isWarning
            ? "bg-warning-soft"
            : "bg-danger-soft"
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center",
              isHealthy
                ? "bg-success-solid"
                : isWarning
                ? "bg-warning-solid"
                : "bg-danger-solid"
            )}
          >
            {isHealthy ? (
              <CheckCircleFilled className="w-8 h-8 text-white" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-white" />
            )}
          </div>

          <div className="flex-1">
            <h2
              className={cn(
                "text-2xl font-semibold mb-1",
                isHealthy
                  ? "text-success"
                  : isWarning
                  ? "text-warning"
                  : "text-danger"
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
                  ? "text-success-soft"
                  : isWarning
                  ? "text-warning-soft"
                  : "text-danger-soft"
              )}
            >
              {isHealthy
                ? `${accountsCount} accounts monitored, no issues detected`
                : `${warningCount} ${
                    warningCount === 1 ? "issue" : "issues"
                  } detected across ${accountsCount} ${
                    accountsCount === 1 ? "account" : "accounts"
                  }`}
            </p>
          </div>
        </div>
      </div>
    </AnimateLayout>
  );
}

export default function AccountHealth() {
  const toolOutput = useWidgetProps<ToolOutput>();
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const isFullscreen = displayMode === "fullscreen";

  // Show loading skeleton during initial load
  if (!toolOutput) {
    return <WidgetLoadingSkeleton />;
  }

  // Auth checks
  const authComponent = checkWidgetAuth(toolOutput);
  if (authComponent) return authComponent;

  // Show empty state only if there's truly no data
  if (!toolOutput.accounts || toolOutput.accounts.length === 0) {
    return (
      <EmptyMessage>
        <EmptyMessage.Title>No accounts to monitor</EmptyMessage.Title>
      </EmptyMessage>
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
        "antialiased w-full relative bg-transparent text-default",
        !isFullscreen && "overflow-hidden"
      )}
      style={{
        maxHeight: maxHeight ?? undefined,
        height: isFullscreen ? maxHeight ?? undefined : undefined,
      }}
    >
      {/* Fullscreen expand button */}
      {!isFullscreen && (
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
      )}

      {/* Content */}
      <div
        className={cn(
          "w-full h-full overflow-y-auto",
          isFullscreen ? "p-8" : "p-0"
        )}
      >
        {/* Header */}
        <div className="mb-6">
          <h1 className="heading-lg mb-2">Account Health</h1>
          <div className="flex items-center gap-3">
            <Trending
              className={cn(
                "w-5 h-5",
                overallStatus === "healthy" ? "text-success" : "text-warning"
              )}
            />
            <p className="text-sm text-secondary">
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
          />
        </div>

        {/* Warning Cards */}
        {accountsWithWarnings.length > 0 ? (
          <div>
            <h2 className="text-lg font-medium mb-4 text-default">
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
                {accountsWithWarnings.map((account, index) => (
                  <WarningCard
                    key={account.account_id}
                    account={account}
                    index={index}
                  />
                ))}
            </div>
          </div>
        ) : (
          <AnimateLayout>
            <div key="no-issues" className="text-center py-12 rounded-2xl border bg-surface border-subtle shadow-hairline">
              <CheckCircleFilled className="w-16 h-16 mx-auto mb-4 text-success" />
              <h3 className="text-lg font-medium mb-2 text-default">
                Everything looks great!
              </h3>
              <p className="text-sm text-secondary">
                No issues detected across your accounts
              </p>
            </div>
          </AnimateLayout>
        )}
      </div>
    </div>
  );
}
