"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Expand,
  Search,
  Filter,
  Calendar,
  ArrowDown,
  ArrowUp,
  DollarCircle,
  ChevronDown,
} from "@openai/apps-sdk-ui/components/Icon";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Input } from "@openai/apps-sdk-ui/components/Input";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { Select } from "@openai/apps-sdk-ui/components/Select";
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { useWidgetProps } from "@/src/use-widget-props";
import { useOpenAiGlobal } from "@/src/use-openai-global";
import { useWidgetState } from "@/src/use-widget-state";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { formatCurrency, formatDate } from "@/src/utils/format";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";
import type { Transaction } from "plaid";

interface TransactionWithEnrichment extends Transaction {
  // All fields from Plaid Transaction type are available
}

interface ToolOutputData extends Record<string, unknown> {
  totalTransactions?: number;
  displayedTransactions?: number;
  dateRange?: {
    start: string;
    end: string;
  };
  metadata?: {
    categoryBreakdown: Array<{
      category: string;
      count: number;
      total: number;
    }>;
    topMerchants: Array<{
      merchantId: string;
      name: string;
      count: number;
      total: number;
    }>;
    summary: {
      totalSpending: number;
      totalIncome: number;
      netCashFlow: number;
      pendingCount: number;
      averageTransaction: number;
    };
  };
}

interface ToolMetadata {
  transactions: TransactionWithEnrichment[];
}

interface TransactionsUIState extends Record<string, unknown> {
  selectedCategory: string | null;
  searchQuery: string;
  showPendingOnly: boolean;
  expandedTx: string | null;
  showAllDates: boolean;
  expandedDateGroups: string[];
}

// Category mapping to SDK colors/badges
const CATEGORY_STYLES: Record<string, { color: "success" | "warning" | "danger" | "info" | "discovery" | "secondary"; icon: string }> = {
  FOOD_AND_DRINK: { color: "warning", icon: "🍔" },
  GENERAL_MERCHANDISE: { color: "info", icon: "🛍️" },
  TRANSPORTATION: { color: "discovery", icon: "🚗" },
  TRANSFER_IN: { color: "success", icon: "💰" },
  TRANSFER_OUT: { color: "danger", icon: "💸" },
  ENTERTAINMENT: { color: "discovery", icon: "🎬" },
  TRAVEL: { color: "info", icon: "✈️" },
  GENERAL_SERVICES: { color: "secondary", icon: "⚙️" },
  RENT_AND_UTILITIES: { color: "warning", icon: "🏠" },
  HOME_IMPROVEMENT: { color: "info", icon: "🔨" },
  MEDICAL: { color: "danger", icon: "🏥" },
  BANK_FEES: { color: "secondary", icon: "🏦" },
  LOAN_PAYMENTS: { color: "discovery", icon: "💳" },
  INCOME: { color: "success", icon: "💵" },
  UNCATEGORIZED: { color: "secondary", icon: "❓" },
};

const PAYMENT_CHANNEL_ICONS: Record<string, string> = {
  online: "🌐",
  "in store": "🏪",
  other: "💳",
};

function formatCategoryName(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export default function Transactions() {
  const toolOutput = useWidgetProps<ToolOutputData>();
  const toolMetadata = useOpenAiGlobal("toolResponseMetadata") as ToolMetadata | null;
  const [uiState, setUiState] = useWidgetState<TransactionsUIState>({
    selectedCategory: null,
    searchQuery: "",
    showPendingOnly: false,
    expandedTx: null,
    showAllDates: false,
    expandedDateGroups: [],
  });

  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const isFullscreen = displayMode === "fullscreen";

  // Max visible transactions per date group in inline mode
  const MAX_VISIBLE_INLINE = 3;
  // Max visible date groups in inline mode
  const MAX_DATE_GROUPS_INLINE = 3;

  const transactions = toolMetadata?.transactions || [];
  const metadata = toolOutput?.metadata;

  const expandedDateGroupsSet = useMemo(() => new Set(uiState.expandedDateGroups), [uiState.expandedDateGroups]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (uiState.selectedCategory) {
      filtered = filtered.filter(
        (tx) => tx.personal_finance_category?.primary === uiState.selectedCategory
      );
    }

    if (uiState.searchQuery) {
      const query = uiState.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          (tx.merchant_name?.toLowerCase() || "").includes(query) ||
          (tx.name?.toLowerCase() || "").includes(query) ||
          (tx.personal_finance_category?.detailed?.toLowerCase() || "").includes(query)
      );
    }

    if (uiState.showPendingOnly) {
      filtered = filtered.filter((tx) => tx.pending);
    }

    return filtered;
  }, [transactions, uiState.selectedCategory, uiState.searchQuery, uiState.showPendingOnly]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, TransactionWithEnrichment[]> = {};
    filteredTransactions.forEach((tx) => {
      const date = tx.authorized_date || tx.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(tx);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  const authComponent = checkWidgetAuth(toolOutput);
  if (authComponent) return authComponent;

  if (!toolOutput && !toolMetadata) {
    return (
      <EmptyMessage>
        <EmptyMessage.Title>No transactions available</EmptyMessage.Title>
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

      <div className={`w-full h-full overflow-y-auto ${isFullscreen ? "p-8" : "p-0"}`}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="heading-lg mb-2">
            Transactions
          </h1>
          {toolOutput?.dateRange && (
            <p className="text-sm text-secondary">
              {`${formatDate(toolOutput.dateRange.start)} - ${formatDate(toolOutput.dateRange.end)}`}
            </p>
          )}
        </div>

        {/* Summary Cards */}
        {metadata && (
          <div
            className={`grid gap-4 mb-6 ${isFullscreen ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"}`}
          >
            <div className="rounded-2xl border-none bg-success-soft p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-success-surface text-success-soft">
                  <ArrowUp className="h-4 w-4" />
                </div>
                <div className="text-xs font-medium text-success-soft">
                  Income
                </div>
              </div>
              <div className="text-xl font-bold text-success-soft">
                {formatCurrency(metadata.summary.totalIncome)}
              </div>
            </div>

            <div className="rounded-2xl border-none bg-danger-soft p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-danger-surface text-danger-soft">
                  <ArrowDown className="h-4 w-4" />
                </div>
                <div className="text-xs font-medium text-danger-soft">
                  Spending
                </div>
              </div>
              <div className="text-xl font-bold text-danger-soft">
                {formatCurrency(metadata.summary.totalSpending)}
              </div>
            </div>

            <div className="rounded-2xl border-none bg-info-soft p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-info-surface text-info-soft">
                  <DollarCircle className="h-4 w-4" />
                </div>
                <div className="text-xs font-medium text-info-soft">
                  Net Flow
                </div>
              </div>
              <div
                className={`text-xl font-bold ${metadata.summary.netCashFlow >= 0 ? "text-success-soft" : "text-danger-soft"}`}
              >
                {metadata.summary.netCashFlow >= 0 ? "+" : ""}
                {formatCurrency(metadata.summary.netCashFlow)}
              </div>
            </div>

            <div className="rounded-2xl border-none bg-discovery-soft p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-discovery-surface text-discovery-soft">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="text-xs font-medium text-discovery-soft">
                  Pending
                </div>
              </div>
              <div className="text-xl font-bold text-discovery-soft">
                {metadata.summary.pendingCount}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {metadata && (
          <div
            className={`mb-6 flex flex-col gap-3 ${isFullscreen ? "md:flex-row md:items-center" : ""}`}
          >
            <div className="flex-1">
              <Input
                placeholder="Search transactions..."
                value={uiState.searchQuery}
                onChange={(e) => setUiState(s => ({ ...s, searchQuery: e.target.value }))}
                startAdornment={<Search className="text-tertiary" />}
              />
            </div>

            <Select
              value={uiState.selectedCategory || ""}
              onChange={(val: any) => setUiState(s => ({...s, selectedCategory: val?.value || null}))}
              options={[
                { value: "", label: "All Categories" },
                ...metadata.categoryBreakdown.map((cat) => ({
                  value: cat.category,
                  label: `${formatCategoryName(cat.category)} (${cat.count})`
                }))
              ]}
              placeholder="All Categories"
              dropdownIconType="chevronDown"
            />

            <Button
              variant={uiState.showPendingOnly ? "solid" : "outline"}
              color="discovery"
              onClick={() => setUiState(s => ({...s, showPendingOnly: !s.showPendingOnly}))}
            >
              <Filter className="mr-2" />
              {uiState.showPendingOnly ? "Show All" : "Pending"}
            </Button>
          </div>
        )}

        {/* Transaction List */}
        {filteredTransactions.length === 0 ? (
          <EmptyMessage>
            <EmptyMessage.Title>No transactions match your filters</EmptyMessage.Title>
          </EmptyMessage>
        ) : (
          <div className="space-y-6">
            {(isFullscreen || uiState.showAllDates
              ? groupedTransactions
              : groupedTransactions.slice(0, MAX_DATE_GROUPS_INLINE)
            ).map(([date, txs], groupIndex) => (
              <div key={date}>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-secondary">
                    {formatDate(date)}
                  </h3>
                </div>

                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {(isFullscreen || expandedDateGroupsSet.has(date) ? txs : txs.slice(0, MAX_VISIBLE_INLINE)).map((tx, txIndex) => {
                      const isExpanded = uiState.expandedTx === tx.transaction_id;
                      const merchantName = tx.merchant_name || tx.name || "Unknown";
                      const category = tx.personal_finance_category?.primary || "UNCATEGORIZED";
                      const categoryDetailed =
                        tx.personal_finance_category?.detailed || "Uncategorized";
                      const categoryStyle = CATEGORY_STYLES[category] || CATEGORY_STYLES.UNCATEGORIZED;
                      const logo = tx.logo_url || tx.counterparties?.[0]?.logo_url;

                      return (
                        <motion.div
                          key={tx.transaction_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: (groupIndex * 0.02) + (txIndex * 0.02) }}
                          className="rounded-2xl border-none bg-surface shadow-none cursor-pointer hover:bg-surface-secondary transition-colors"
                          onClick={() => setUiState(s => ({...s, expandedTx: isExpanded ? null : tx.transaction_id}))}
                        >
                          <div className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0">
                                {logo ? (
                                  <img
                                    src={logo}
                                    alt={merchantName}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-subtle"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                      const fallback = document.createElement("div");
                                      fallback.className = "w-12 h-12 rounded-full bg-surface-tertiary flex items-center justify-center text-default font-bold text-lg";
                                      fallback.textContent = merchantName.charAt(0).toUpperCase();
                                      e.currentTarget.parentElement?.appendChild(fallback);
                                    }}
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-surface-tertiary flex items-center justify-center text-default font-bold text-lg">
                                    {merchantName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold truncate text-default">
                                    {merchantName}
                                  </h3>
                                  {tx.pending && (
                                    <Badge color="warning" size="sm" pill>Pending</Badge>
                                  )}
                                  {tx.payment_channel && (
                                    <span className="text-sm">
                                      {PAYMENT_CHANNEL_ICONS[tx.payment_channel]}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <Badge color={categoryStyle.color} variant="soft" size="sm">
                                    {categoryStyle.icon} {formatCategoryName(category)}
                                  </Badge>
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                <div
                                  className={`text-lg font-bold ${tx.amount < 0 ? "text-success" : "text-default"}`}
                                >
                                  {tx.amount < 0
                                    ? `+${formatCurrency(Math.abs(tx.amount), tx.iso_currency_code || "USD")}`
                                    : `-${formatCurrency(tx.amount, tx.iso_currency_code || "USD")}`
                                  }
                                </div>
                              </div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 border-t border-subtle">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                    <div className="space-y-3">
                                      <div>
                                        <div className="text-xs font-medium uppercase mb-1 text-tertiary">Category</div>
                                        <div className="text-sm text-default">{formatCategoryName(categoryDetailed)}</div>
                                      </div>
                                      {tx.payment_channel && (
                                        <div>
                                          <div className="text-xs font-medium uppercase mb-1 text-tertiary">Payment Channel</div>
                                          <div className="text-sm capitalize text-default">{tx.payment_channel}</div>
                                        </div>
                                      )}
                                      {tx.location?.city && (
                                        <div>
                                          <div className="text-xs font-medium uppercase mb-1 text-tertiary">Location</div>
                                          <div className="text-sm text-default">
                                            {[tx.location.address, tx.location.city, tx.location.region].filter(Boolean).join(", ")}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="space-y-3">
                                      {tx.check_number && (
                                        <div>
                                          <div className="text-xs font-medium uppercase mb-1 text-tertiary">Check Number</div>
                                          <div className="text-sm text-default">#{tx.check_number}</div>
                                        </div>
                                      )}
                                      {tx.original_description && (
                                        <div>
                                          <div className="text-xs font-medium uppercase mb-1 text-tertiary">Bank Description</div>
                                          <div className="text-sm font-mono text-secondary">{tx.original_description}</div>
                                        </div>
                                      )}
                                      {tx.counterparties && tx.counterparties.length > 0 && (
                                        <div>
                                          <div className="text-xs font-medium uppercase mb-1 text-tertiary">Counterparty</div>
                                          <div className="text-sm text-default">
                                            {tx.counterparties[0].name}
                                            {tx.counterparties[0].type && <span className="ml-1 text-secondary">({tx.counterparties[0].type})</span>}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {!isFullscreen && !expandedDateGroupsSet.has(date) && txs.length > MAX_VISIBLE_INLINE && (
                    <Button
                      variant="outline"
                      color="secondary"
                      className="w-full"
                      onClick={() => {
                        setUiState(s => ({ ...s, expandedDateGroups: [...s.expandedDateGroups, date]}));
                      }}
                    >
                      +{txs.length - MAX_VISIBLE_INLINE} more
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {!isFullscreen && !uiState.showAllDates && groupedTransactions.length > MAX_DATE_GROUPS_INLINE && (
              <Button
                variant="outline"
                color="secondary"
                className="w-full"
                onClick={() => window.openai?.requestDisplayMode({ mode: "fullscreen" })}
              >
                +{groupedTransactions.length - MAX_DATE_GROUPS_INLINE} more dates
              </Button>
            )}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-secondary">
          Showing {filteredTransactions.length} of {toolOutput?.totalTransactions ?? transactions.length} transactions
        </div>
      </div>
    </div>
  );
}
