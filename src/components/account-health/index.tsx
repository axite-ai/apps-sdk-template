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
          <AnimateLayout>
            <div
              key="health-status-card"
              className={cn(
                "rounded-xl border border-subtle p-6 shadow-sm overflow-hidden relative",
                overallStatus === "healthy" ? "bg-success-soft/30" :
                overallStatus === "warning" ? "bg-warning-soft/30" : "bg-danger-soft/30"
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-2xl",
                    overallStatus === "healthy" ? "bg-success-soft text-success" :
                    overallStatus === "warning" ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger"
                  )}
                >
                  {overallStatus === "healthy" ? <CheckCircleFilled className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-default">
                    {overallStatus === "healthy" ? "All Good" :
                     overallStatus === "warning" ? "Needs Review" : "Action Required"}
                  </h2>
                  <p className="text-sm text-secondary">
                    {totalWarnings === 0
                      ? `${accounts.length} accounts monitored`
                      : `${totalWarnings} issues detected across ${accountsWithWarnings.length} accounts`}
                  </p>
                </div>
              </div>
            </div>
          </AnimateLayout>
        </div>

        {/* Warning Cards */}
        {accountsWithWarnings.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-3">
              Action Items
            </h2>
            <div className="space-y-3">
              {accountsWithWarnings.map((account, index) => (
                <div key={account.account_id} className="bg-surface rounded-xl border border-subtle overflow-hidden">
                  <div className="px-4 py-3 border-b border-subtle bg-surface-secondary/20">
                    <h3 className="font-medium text-sm text-default">{account.accountName}</h3>
                  </div>
                  <div>
                    {account.warnings.map((warning, wIndex) => {
                      const severity = getWarningSeverity(warning);
                      return (
                        <div
                          key={wIndex}
                          className={cn(
                            "flex items-start gap-3 p-3 border-b last:border-b-0 border-subtle",
                            "hover:bg-surface-secondary/30 transition-colors"
                          )}
                        >
                          <div className="mt-0.5">
                            {severity === "error" ? (
                              <Error className="w-4 h-4 text-danger" />
                            ) : severity === "warning" ? (
                              <Warning className="w-4 h-4 text-warning" />
                            ) : (
                              <div className="w-4 h-4 flex items-center justify-center text-xs">ℹ️</div>
                            )}
                          </div>
                          <p className="text-sm text-default leading-snug">{warning}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-success-soft rounded-full flex items-center justify-center mb-4">
              <CheckCircleFilled className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-lg font-medium text-default mb-1">Everything looks healthy</h3>
            <p className="text-sm text-secondary">We'll let you know if anything needs attention.</p>
          </div>
        )}
      </div>
    </div>
  );
}
