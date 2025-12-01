"use client";

import React from "react";
import {
  Expand,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
} from "@openai/apps-sdk-ui/components/Icon";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { AnimateLayout } from "@openai/apps-sdk-ui/components/Transition";
import { useWidgetProps } from "@/src/use-widget-props";
import { useOpenAiGlobal } from "@/src/use-openai-global";
import { useWidgetState } from "@/src/use-widget-state";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { formatCurrency } from "@/src/utils/format";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";
import { WidgetLoadingSkeleton } from "@/src/components/shared/widget-loading-skeleton";
import { cn } from "@/lib/utils/cn";
import type { AccountOverviewContent } from "@/lib/types/tool-responses";

interface Account {
  account_id: string;
  name: string;
  type: string;
  subtype?: string;
  mask: string | null;
  balances: {
    current: number | null;
    available: number | null;
    iso_currency_code: string;
  };
}

interface Projection {
  month: number;
  projectedBalance: number;
  confidence: "high" | "medium" | "low";
}

interface ToolOutput extends AccountOverviewContent, Record<string, unknown> {}

interface BalancesUIState extends Record<string, unknown> {
  expandedAccountIds: string[];
}

function getAccountIcon(type: string, subtype?: string) {
  const iconType = (subtype || type).toLowerCase();

  if (iconType.includes("checking")) return "💳";
  if (iconType.includes("savings")) return "🏦";
  if (iconType.includes("credit")) return "💎";
  if (iconType.includes("investment") || iconType.includes("brokerage"))
    return "📈";
  if (iconType.includes("loan") || iconType.includes("mortgage")) return "🏠";
  return "💰";
}

function getAccountColorClass(type: string) {
  const lower = type.toLowerCase();
  if (lower.includes("checking")) return "bg-info-soft text-info";
  if (lower.includes("savings")) return "bg-success-soft text-success";
  if (lower.includes("credit")) return "bg-discovery-soft text-discovery";
  if (lower.includes("investment")) return "bg-warning-soft text-warning";
  if (lower.includes("loan")) return "bg-danger-soft text-danger";
  return "bg-surface-secondary text-secondary";
}

function getHealthBadgeColor(score: number): "success" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

function getTrendIcon(trend: string) {
  if (trend === "improving") return <ArrowUp className="w-4 h-4 text-success" />;
  if (trend === "declining") return <ArrowDown className="w-4 h-4 text-danger" />;
  return null;
}

interface AccountCardProps {
  account: Account;
  isExpanded: boolean;
  onToggle: () => void;
}

function AccountCard({ account, isExpanded, onToggle }: AccountCardProps) {
  const hasAvailable =
    account.balances.available !== null &&
    account.balances.available !== account.balances.current;

  return (
    <div className="relative p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={cn(
              "shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl",
              getAccountColorClass(account.type)
            )}
          >
            {getAccountIcon(account.type, account.subtype)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base truncate text-default">
              {account.name}
            </h3>
            <p className="text-sm mt-0.5 text-secondary">
              {account.type}
              {account.mask && ` • ****${account.mask}`}
            </p>
          </div>
        </div>

        {hasAvailable && (
          <Button
            variant="ghost"
            size="sm"
            color="secondary"
            onClick={onToggle}
            aria-label={isExpanded ? "Show less" : "Show more"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Current Balance */}
      {account.balances.current !== null && (
        <div className="mb-3">
          <div className="text-xs font-medium mb-1 text-tertiary uppercase tracking-wide">
            Current Balance
          </div>
          <div className="text-2xl font-semibold text-default">
            {formatCurrency(
              account.balances.current,
              account.balances.iso_currency_code
            )}
          </div>
        </div>
      )}

      {/* Available Balance (expandable) */}
      {hasAvailable && isExpanded && (
        <div className="pt-3 mt-3 border-t border-subtle">
          <div className="text-xs font-medium mb-1 text-tertiary uppercase tracking-wide">
            Available Balance
          </div>
          <div className="text-lg font-semibold text-success">
            {formatCurrency(
              account.balances.available!,
              account.balances.iso_currency_code
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountBalances() {
  const toolOutput = useWidgetProps<ToolOutput>();
  const toolMetadata = useOpenAiGlobal("toolResponseMetadata") as any;
  const [uiState, setUiState] = useWidgetState<BalancesUIState>({
    expandedAccountIds: [],
  });

  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const isFullscreen = displayMode === "fullscreen";

  const toggleAccountExpanded = (accountId: string) => {
    setUiState(prevState => {
      const currentlyExpanded = new Set(prevState.expandedAccountIds);
      if (currentlyExpanded.has(accountId)) {
        currentlyExpanded.delete(accountId);
      } else {
        currentlyExpanded.add(accountId);
      }
      return { ...prevState, expandedAccountIds: Array.from(currentlyExpanded) };
    });
  };

  // Show loading skeleton during initial load
  if (!toolOutput) {
    return <WidgetLoadingSkeleton />;
  }

  // Check for auth requirements
  const authComponent = checkWidgetAuth(toolOutput);
  if (authComponent) return authComponent;

  // Show empty state only if there's truly no data
  if (!toolOutput?.summary || !toolOutput?.accounts) {
    return (
      <EmptyMessage>
        <EmptyMessage.Title>No account data available</EmptyMessage.Title>
      </EmptyMessage>
    );
  }

  const { summary, accounts } = toolOutput;
  const projections = (toolMetadata?.projections ?? toolOutput.projections ?? []) as Projection[];

  // No data check
  if (!accounts || accounts.length === 0) {
    return (
      <EmptyMessage>
        <EmptyMessage.Title>No accounts found</EmptyMessage.Title>
      </EmptyMessage>
    );
  }

  return (
    <div
      className={`antialiased w-full relative bg-transparent text-default ${!isFullscreen ? "overflow-hidden" : ""}`}
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
        className={`w-full h-full overflow-y-auto ${isFullscreen ? "p-8" : "p-0"}`}
      >
        {/* Header */}
        <div className="mb-6">
          <h1 className="heading-lg mb-2">
            Financial Overview
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-secondary">
                Total Balance
              </p>
              <p className="text-3xl font-semibold mt-1 text-default">
                {formatCurrency(summary.totalBalance)}
              </p>
              <p className="text-xs mt-1 text-tertiary">
                {summary.accountCount} {summary.accountCount === 1 ? "account" : "accounts"}
              </p>
            </div>
            <div>
              <p className="text-sm text-secondary mb-1">
                Health Score
              </p>
              <div className="flex items-center gap-2">
                <Badge color={getHealthBadgeColor(summary.healthScore)} size="lg">
                  {summary.healthScore} / 100
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-secondary">
                Trend
              </p>
              <div className="flex items-center gap-2 mt-2">
                {getTrendIcon(summary.trend)}
                <span className="text-lg font-medium capitalize text-default">
                  {summary.trend}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Projections */}
        {projections && projections.length > 0 && (
          <div className="mb-6 p-4 rounded-xl border border-subtle bg-surface-secondary">
            <h2 className="text-sm font-medium mb-3 text-secondary">
              Cash Flow Projection
            </h2>
            <div className="space-y-2">
              {projections.map((proj) => (
                <div key={proj.month} className="flex items-center gap-3">
                  <span className="text-xs w-16 text-secondary">
                    Month {proj.month}
                  </span>
                  <div className="flex-1 h-2 bg-surface-tertiary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full",
                        proj.confidence === "high" ? "bg-success" :
                        proj.confidence === "medium" ? "bg-warning" : "bg-secondary"
                      )}
                      style={{ width: `${Math.min(100, (proj.projectedBalance / summary.totalBalance) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs w-24 text-right text-default">
                    {formatCurrency(proj.projectedBalance)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Account Grid */}
        <div
          className={cn(
            "grid gap-4",
            isFullscreen
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1"
          )}
        >
          {accounts.map((account) => {
            const mappedAccount: Account = {
              account_id: account.id,
              name: account.name,
              type: account.type,
              subtype: account.subtype,
              mask: null,
              balances: {
                current: account.balance,
                available: account.available,
                iso_currency_code: account.currencyCode
              }
            };
            return (
              <AnimateLayout
                key={account.id}
                className="group relative overflow-hidden rounded-2xl border border-subtle bg-surface shadow-hairline hover:bg-surface-secondary transition-colors"
              >
                  <AccountCard
                    key={"card"}
                    account={mappedAccount}
                    isExpanded={uiState.expandedAccountIds.includes(account.id)}
                    onToggle={() => toggleAccountExpanded(account.id)}
                  />
              </AnimateLayout>
            );
          })}
        </div>
      </div>
    </div>
  );
}
