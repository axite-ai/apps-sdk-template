"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, TrendingUp, TrendingDown, Wallet, PieChart } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useWidgetProps } from "@/src/use-widget-props";
import { useOpenAiGlobal } from "@/src/use-openai-global";
import { useWidgetState } from "@/src/use-widget-state";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { useTheme } from "@/src/use-theme";
import { formatCurrency, formatPercent } from "@/src/utils/format";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";

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
  const theme = useTheme();
  const isFullscreen = displayMode === "fullscreen";
  const isDark = theme === "dark";

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

  if (!toolOutput && !toolMetadata) {
    return (
      <div
        className={cn(
          "antialiased w-full relative flex items-center justify-center",
          isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-black"
        )}
        style={{ maxHeight: maxHeight ?? undefined }}
      >
        <p className={cn("text-sm", isDark ? "text-white/60" : "text-black/60")}>
          No investment data available
        </p>
      </div>
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
      <div
        className={cn(
          "antialiased w-full relative flex items-center justify-center",
          isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-black"
        )}
        style={{ maxHeight: maxHeight ?? undefined }}
      >
        <p className={cn("text-sm", isDark ? "text-white/60" : "text-black/60")}>
          No investment holdings available
        </p>
      </div>
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
        "antialiased w-full relative",
        isDark ? "bg-gray-900" : "bg-gray-50",
        !isFullscreen && "overflow-hidden"
      )}
      style={{
        maxHeight: maxHeight ?? undefined,
        height: isFullscreen ? maxHeight ?? undefined : undefined,
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
          <h1 className={cn("text-2xl font-semibold mb-2", isDark ? "text-white" : "text-black")}>
            Investments
          </h1>
          <p className={cn("text-sm", isDark ? "text-white/60" : "text-black/60")}>
            Your investment portfolio overview
          </p>
        </div>

        {/* Portfolio Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-2xl border p-6 shadow-[0px_2px_6px_rgba(0,0,0,0.06)] mb-6",
            isDark
              ? "bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border-purple-500/20"
              : "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200"
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={cn(
                "p-3 rounded-xl",
                isDark ? "bg-purple-500/30" : "bg-purple-100"
              )}
            >
              <PieChart strokeWidth={1.5} className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className={cn("text-sm font-medium mb-1", isDark ? "text-purple-300" : "text-purple-700")}>
                Total Portfolio Value
              </div>
              <div className={cn("text-3xl font-bold", isDark ? "text-white" : "text-black")}>
                {formatCurrency(totalValue)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div
              className={cn(
                "rounded-xl p-3",
                isDark ? "bg-purple-500/10" : "bg-white"
              )}
            >
              <div className={cn("text-xs font-medium mb-1", isDark ? "text-white/60" : "text-black/60")}>
                Accounts
              </div>
              <div className={cn("text-xl font-semibold", isDark ? "text-white" : "text-black")}>
                {accountCount}
              </div>
            </div>
            <div
              className={cn(
                "rounded-xl p-3",
                isDark ? "bg-purple-500/10" : "bg-white"
              )}
            >
              <div className={cn("text-xs font-medium mb-1", isDark ? "text-white/60" : "text-black/60")}>
                Holdings
              </div>
              <div className={cn("text-xl font-semibold", isDark ? "text-white" : "text-black")}>
                {holdingCount}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Investment Accounts */}
        <div className="space-y-4">
          {(isFullscreen ? accounts : accounts.slice(0, MAX_VISIBLE_INLINE)).map((account: Account, index: number) => {
            const accountHoldings: Holding[] = holdingsByAccount[account.account_id] || [];
            const accountValue = accountHoldings.reduce(
              (sum: number, h: Holding) => sum + h.institution_value,
              0
            );
            const isExpanded = uiState.expandedAccountIds.includes(account.account_id);

            return (
              <motion.div
                key={account.account_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "rounded-2xl border shadow-[0px_2px_6px_rgba(0,0,0,0.06)] overflow-hidden",
                  isDark ? "bg-gray-800 border-white/10" : "bg-white border-black/5"
                )}
              >
                {/* Account Header */}
                <div
                  className={cn(
                    "p-4 cursor-pointer transition-colors",
                    isDark ? "hover:bg-gray-750" : "hover:bg-gray-50"
                  )}
                  onClick={() => toggleAccountExpanded(account.account_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          isDark ? "bg-blue-500/20" : "bg-blue-100"
                        )}
                      >
                        <Wallet strokeWidth={1.5} className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className={cn("font-semibold", isDark ? "text-white" : "text-black")}>
                          {account.name}
                        </h3>
                        <p className={cn("text-sm", isDark ? "text-white/60" : "text-black/60")}>
                          {account.subtype || account.type}
                          {account.mask && ` • ****${account.mask}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("text-lg font-bold", isDark ? "text-white" : "text-black")}>
                        {formatCurrency(accountValue, account.balances.iso_currency_code)}
                      </div>
                      <div className={cn("text-xs", isDark ? "text-white/60" : "text-black/60")}>
                        {accountHoldings.length} holdings
                      </div>
                    </div>
                  </div>
                </div>

                {/* Holdings List (Expanded) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        className={cn(
                          "border-t",
                          isDark ? "border-white/10" : "border-black/5"
                        )}
                      >
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
                              className={cn(
                                "p-4 border-b last:border-b-0",
                                isDark ? "border-white/10" : "border-black/5"
                              )}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4
                                    className={cn(
                                      "font-semibold mb-1",
                                      isDark ? "text-white" : "text-black"
                                    )}
                                  >
                                    {security.name}
                                  </h4>
                                  <div className="flex items-center gap-2 text-xs">
                                    {security.ticker_symbol && (
                                      <span
                                        className={cn(
                                          "font-semibold px-2 py-0.5 rounded",
                                          isDark
                                            ? "bg-indigo-500/20 text-indigo-400"
                                            : "bg-indigo-100 text-indigo-700"
                                        )}
                                      >
                                        {security.ticker_symbol}
                                      </span>
                                    )}
                                    <span className={cn(isDark ? "text-white/60" : "text-black/60")}>
                                      {security.type}
                                    </span>
                                    <span className={cn(isDark ? "text-white/60" : "text-black/60")}>
                                      {holding.quantity} shares
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div
                                    className={cn(
                                      "text-lg font-bold mb-1",
                                      isDark ? "text-white" : "text-black"
                                    )}
                                  >
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
                                          ? "text-green-600 dark:text-green-400"
                                          : "text-red-600 dark:text-red-400"
                                      )}
                                    >
                                      {gainLoss >= 0 ? (
                                        <TrendingUp strokeWidth={1.5} className="h-3 w-3" />
                                      ) : (
                                        <TrendingDown strokeWidth={1.5} className="h-3 w-3" />
                                      )}
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
                              <div
                                className={cn(
                                  "grid grid-cols-2 gap-3 pt-3 border-t text-xs",
                                  isDark ? "border-white/10" : "border-black/5"
                                )}
                              >
                                <div>
                                  <div
                                    className={cn(
                                      "font-medium mb-1",
                                      isDark ? "text-white/60" : "text-black/60"
                                    )}
                                  >
                                    Current Price
                                  </div>
                                  <div className={cn(isDark ? "text-white" : "text-black")}>
                                    {formatCurrency(
                                      holding.institution_price,
                                      holding.iso_currency_code
                                    )}
                                  </div>
                                </div>
                                {holding.cost_basis && (
                                  <div>
                                    <div
                                      className={cn(
                                        "font-medium mb-1",
                                        isDark ? "text-white/60" : "text-black/60"
                                      )}
                                    >
                                      Cost Basis
                                    </div>
                                    <div className={cn(isDark ? "text-white" : "text-black")}>
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* "+# more" indicator for inline mode */}
          {!isFullscreen && accounts.length > MAX_VISIBLE_INLINE && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: MAX_VISIBLE_INLINE * 0.05 }}
              onClick={() => window.openai?.requestDisplayMode({ mode: "fullscreen" })}
              className={cn(
                "w-full flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition-all cursor-pointer",
                isDark
                  ? "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  : "border-black/10 bg-white/40 text-black/60 hover:bg-white/50"
              )}
            >
              +{accounts.length - MAX_VISIBLE_INLINE} more
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
