"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";
import {
  Expand,
  Trending,
  Business,
  Chart,
} from "@openai/apps-sdk-ui/components/Icon";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { AnimateLayout } from "@openai/apps-sdk-ui/components/Transition";
import { cn } from "@/lib/utils/cn";
import { useWidgetProps } from "@/src/use-widget-props";
import { useOpenAiGlobal } from "@/src/use-openai-global";
import { useWidgetState } from "@/src/use-widget-state";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { formatCurrency, formatPercent } from "@/src/utils/format";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";
import WidgetLoadingSkeleton from "@/src/components/shared/widget-loading-skeleton";

interface Account {
  account_id: string;
  name: string;
  type: string;
  subtype: string;
  mask: string | null;
  balances: {
    current: number | null;
    available: number | null;
    iso_currency_code: string;
  };
}

interface Holding {
  account_id: string;
  security_id: string;
  cost_basis: number | null;
  institution_price: number;
  institution_price_as_of: string | null;
  institution_value: number;
  iso_currency_code: string;
  quantity: number;
  unofficial_currency_code: string | null;
}

interface Security {
  security_id: string;
  isin: string | null;
  cusip: string | null;
  sedol: string | null;
  institution_security_id: string | null;
  institution_id: string | null;
  proxy_security_id: string | null;
  name: string;
  ticker_symbol: string | null;
  is_cash_equivalent: boolean;
  type: string;
  close_price: number | null;
  close_price_as_of: string | null;
  iso_currency_code: string;
  unofficial_currency_code: string | null;
}

interface ToolOutput extends Record<string, unknown> {
  accountCount?: number;
  holdingCount?: number;
  totalValue?: number;
  featureName?: string;
  message?: string;
  error_message?: string;
}

interface ToolMetadata {
  accounts: Account[];
  holdings: Holding[];
  securities: Security[];
}

interface InvestmentsUIState extends Record<string, unknown> {
  expandedAccountIds: string[];
}


export default function Investments() {
  const toolOutput = useWidgetProps<ToolOutput>();
  const toolMetadata = useOpenAiGlobal("toolResponseMetadata") as ToolMetadata | null;
  const [uiState, setUiState] = useWidgetState<InvestmentsUIState>({
    expandedAccountIds: [],
  });

  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const isFullscreen = displayMode === "fullscreen";

  // Max visible accounts in inline mode
  const MAX_VISIBLE_INLINE = 3;

  const toggleAccountExpanded = (accountId: string) => {
    setUiState(prevState => {
      const expanded = new Set(prevState.expandedAccountIds);
      if (expanded.has(accountId)) {
        expanded.delete(accountId);
      } else {
        expanded.add(accountId);
      }
      return { ...prevState, expandedAccountIds: Array.from(expanded) };
    });
  };

  const authComponent = checkWidgetAuth(toolOutput);
  if (authComponent) return authComponent;

  // Show loading state while waiting for tool output
  if (!toolOutput) {
    return <WidgetLoadingSkeleton />;
  }

  if (!toolMetadata && !toolOutput.totalValue) {
    return (
      <EmptyMessage>
        <EmptyMessage.Title>No investment data available</EmptyMessage.Title>
      </EmptyMessage>
    );
  }

  const accounts: Account[] = toolMetadata?.accounts || [];
  const holdings: Holding[] = toolMetadata?.holdings || [];
  const securities: Security[] = toolMetadata?.securities || [];
  const totalValue: number = toolOutput?.totalValue || 0;
  const accountCount = toolOutput?.accountCount ?? accounts.length;
  const holdingCount = toolOutput?.holdingCount ?? holdings.length;

  if (holdingCount === 0) {
     return (
      <EmptyMessage>
        <EmptyMessage.Title>No investment holdings available</EmptyMessage.Title>
      </EmptyMessage>
    );
  }


  // Create a map of securities for quick lookup
  const securitiesMap = new Map<string, Security>(
    securities.map((sec: Security) => [sec.security_id, sec])
  );

  // Group holdings by account
  const holdingsByAccount = holdings.reduce(
    (acc: Record<string, Holding[]>, holding: Holding) => {
      if (!acc[holding.account_id]) {
        acc[holding.account_id] = [];
      }
      acc[holding.account_id].push(holding);
      return acc;
    },
    {} as Record<string, Holding[]>
  );

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
            Investments
          </h1>
          <p className="text-sm text-secondary">
            Your investment portfolio overview
          </p>
        </div>

        {/* Portfolio Summary Card */}
        <AnimateLayout>
          <div key="portfolio-summary" className="rounded-2xl border-none p-6 shadow-none mb-6 bg-discovery-soft">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-discovery-surface">
                <Chart strokeWidth={1.5} className="h-6 w-6 text-discovery" />
              </div>
              <div>
                <div className="text-sm font-medium mb-1 text-discovery-soft uppercase tracking-wide">
                  Total Portfolio Value
                </div>
                <div className="text-3xl font-bold text-default">
                  {formatCurrency(totalValue)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-3 bg-discovery-surface">
                <div className="text-xs font-medium mb-1 text-secondary uppercase tracking-wide">
                  Accounts
                </div>
                <div className="text-xl font-semibold text-default">
                  {accountCount}
                </div>
              </div>
              <div className="rounded-xl p-3 bg-discovery-surface">
                <div className="text-xs font-medium mb-1 text-secondary uppercase tracking-wide">
                  Holdings
                </div>
                <div className="text-xl font-semibold text-default">
                  {holdingCount}
                </div>
              </div>
            </div>
          </div>
        </AnimateLayout>

        {/* Investment Accounts */}
        <div className="space-y-4">
          {(isFullscreen ? accounts : accounts.slice(0, MAX_VISIBLE_INLINE)).map((account: Account) => {
            const accountHoldings: Holding[] = holdingsByAccount[account.account_id] || [];
            const accountValue = accountHoldings.reduce(
              (sum: number, h: Holding) => sum + h.institution_value,
              0
            );
            const isExpanded = uiState.expandedAccountIds.includes(account.account_id);

            return (
              <AnimateLayout key={account.account_id}>
                <div key={account.account_id} className="rounded-2xl border border-subtle shadow-hairline overflow-hidden bg-surface">
                  {/* Account Header */}
                  <div
                    className="p-4 cursor-pointer transition-colors hover:bg-surface-secondary"
                    onClick={() => toggleAccountExpanded(account.account_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-info-soft">
                          <Business strokeWidth={1.5} className="h-5 w-5 text-info" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-default">
                            {account.name}
                          </h3>
                          <p className="text-sm text-secondary">
                            {account.subtype || account.type}
                            {account.mask && ` • ****${account.mask}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-default">
                          {formatCurrency(accountValue, account.balances.iso_currency_code)}
                        </div>
                        <div className="text-xs text-secondary">
                          {accountHoldings.length} holdings
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Holdings List (Expanded) */}
                  {isExpanded && (
                    <div className="border-t border-subtle">
                      {accountHoldings.map((holding: Holding, idx: number) => {
                        const security: Security | undefined = securitiesMap.get(
                          holding.security_id
                        );
                        if (!security) return null;

                        const gainLoss = holding.cost_basis
                          ? holding.institution_value - holding.cost_basis * holding.quantity
                          : null;
                        const gainLossPercent =
                          holding.cost_basis && holding.cost_basis > 0
                            ? ((holding.institution_price - holding.cost_basis) /
                                holding.cost_basis) *
                              100
                            : null;

                        return (
                          <div
                            key={`${holding.account_id}-${holding.security_id}-${idx}`}
                            className="p-4 border-b last:border-b-0 border-subtle"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold mb-1 text-default">
                                  {security.name}
                                </h4>
                                <div className="flex items-center gap-2 text-xs">
                                  {security.ticker_symbol && (
                                    <span className="font-semibold px-2 py-0.5 rounded bg-info-soft text-info">
                                      {security.ticker_symbol}
                                    </span>
                                  )}
                                  <span className="text-secondary">
                                    {security.type}
                                  </span>
                                  <span className="text-secondary">
                                    {holding.quantity} shares
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold mb-1 text-default">
                                  {formatCurrency(
                                    holding.institution_value,
                                    holding.iso_currency_code
                                  )}
                                </div>
                                {gainLoss !== null && (
                                  <div
                                    className={cn(
                                      "text-xs font-semibold flex items-center gap-1 justify-end",
                                      gainLoss >= 0
                                        ? "text-success"
                                        : "text-danger"
                                    )}
                                  >
                                    <Trending strokeWidth={1.5} className="h-3 w-3" />
                                    <span>
                                      {formatCurrency(
                                        Math.abs(gainLoss),
                                        holding.iso_currency_code
                                      )}
                                      {gainLossPercent !== null &&
                                        ` (${formatPercent(gainLossPercent / 100)})`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-subtle text-xs">
                              <div>
                                <div className="font-medium mb-1 text-secondary uppercase tracking-wide">
                                  Current Price
                                </div>
                                <div className="text-default">
                                  {formatCurrency(
                                    holding.institution_price,
                                    holding.iso_currency_code
                                  )}
                                </div>
                              </div>
                              {holding.cost_basis && (
                                <div>
                                  <div className="font-medium mb-1 text-secondary uppercase tracking-wide">
                                    Cost Basis
                                  </div>
                                  <div className="text-default">
                                    {formatCurrency(
                                      holding.cost_basis,
                                      holding.iso_currency_code
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </AnimateLayout>
            );
          })}

          {/* "+# more" indicator for inline mode */}
          {!isFullscreen && accounts.length > MAX_VISIBLE_INLINE && (
            <Button
              variant="outline"
              color="secondary"
              className="w-full"
              onClick={() => window.openai?.requestDisplayMode({ mode: "fullscreen" })}
            >
              +{accounts.length - MAX_VISIBLE_INLINE} more
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
