"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Search, Filter, Calendar, TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useWidgetProps } from "@/src/use-widget-props";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { useTheme } from "@/src/use-theme";
import { formatCurrency, formatDate } from "@/src/utils/format";
import PlaidRequired from "@/src/components/plaid-required";
import type { Transaction } from "plaid";

interface TransactionWithEnrichment extends Transaction {
  // All fields from Plaid Transaction type are available
}

interface TransactionsData {
  transactions: TransactionWithEnrichment[];
  totalTransactions: number;
  displayedTransactions: number;
  dateRange: {
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

// Category color mapping
const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  FOOD_AND_DRINK: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", icon: "🍔" },
  GENERAL_MERCHANDISE: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", icon: "🛍️" },
  TRANSPORTATION: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", icon: "🚗" },
  TRANSFER_IN: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", icon: "💰" },
  TRANSFER_OUT: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", icon: "💸" },
  ENTERTAINMENT: { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", icon: "🎬" },
  TRAVEL: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", icon: "✈️" },
  GENERAL_SERVICES: { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", icon: "⚙️" },
  RENT_AND_UTILITIES: { bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400", icon: "🏠" },
  HOME_IMPROVEMENT: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", icon: "🔨" },
  MEDICAL: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", icon: "🏥" },
  BANK_FEES: { bg: "bg-gray-500/10", text: "text-gray-600 dark:text-gray-400", icon: "🏦" },
  LOAN_PAYMENTS: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", icon: "💳" },
  INCOME: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", icon: "💵" },
  UNCATEGORIZED: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", icon: "❓" },
};

// Payment channel badges
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
  const rawOutput = useWidgetProps();
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const theme = useTheme();
  const isFullscreen = displayMode === "fullscreen";
  const isDark = theme === "dark";

  // Max visible transactions per date group in inline mode
  const MAX_VISIBLE_INLINE = 3;
  // Max visible date groups in inline mode
  const MAX_DATE_GROUPS_INLINE = 3;

  // All hooks must be called before any conditional returns
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [showAllDates, setShowAllDates] = useState(false);

  // Type guard for TransactionsData
  const toolOutput = rawOutput as unknown as TransactionsData | null | undefined;
  const transactions = toolOutput?.transactions || [];
  const metadata = toolOutput?.metadata;

  // Filter transactions (must be called before any conditional returns)
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(
        (tx) => tx.personal_finance_category?.primary === selectedCategory
      );
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          (tx.merchant_name?.toLowerCase() || "").includes(query) ||
          (tx.name?.toLowerCase() || "").includes(query) ||
          (tx.personal_finance_category?.detailed?.toLowerCase() || "").includes(query)
      );
    }

    // Pending filter
    if (showPendingOnly) {
      filtered = filtered.filter((tx) => tx.pending);
    }

    return filtered;
  }, [transactions, selectedCategory, searchQuery, showPendingOnly]);

  // Group transactions by date
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

  // Now we can do conditional returns after all hooks are called
  // Check if bank connection is required
  if (rawOutput && "message" in rawOutput && rawOutput.message === "Bank connection required") {
    return <PlaidRequired />;
  }

  if (!toolOutput || !toolOutput.transactions) {
    return (
      <div
        className={cn(
          "antialiased w-full relative flex items-center justify-center",
          isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-black"
        )}
        style={{ maxHeight: maxHeight ?? undefined }}
      >
        <div className="text-center p-8">
          <p className={cn("text-sm", isDark ? "text-white/60" : "text-black/60")}>
            No transactions available
          </p>
        </div>
      </div>
    );
  }

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
            Transactions
          </h1>
          <p className={cn("text-sm", isDark ? "text-white/60" : "text-black/60")}>
            {toolOutput.dateRange
              ? `${formatDate(toolOutput.dateRange.start)} - ${formatDate(toolOutput.dateRange.end)}`
              : "Your transaction history"}
          </p>
        </div>

        {/* Summary Cards */}
        {metadata && (
          <div
            className={cn(
              "grid gap-4 mb-6",
              isFullscreen ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"
            )}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className={cn(
                "rounded-2xl border p-4 shadow-[0px_2px_6px_rgba(0,0,0,0.06)]",
                isDark
                  ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/20"
                  : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    isDark ? "bg-green-500/20" : "bg-green-100"
                  )}
                >
                  <TrendingUp strokeWidth={1.5} className="h-4 w-4 text-green-600" />
                </div>
                <div className={cn("text-xs font-medium", isDark ? "text-green-400" : "text-green-700")}>
                  Income
                </div>
              </div>
              <div className={cn("text-xl font-bold", isDark ? "text-green-300" : "text-green-900")}>
                {formatCurrency(metadata.summary.totalIncome)}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className={cn(
                "rounded-2xl border p-4 shadow-[0px_2px_6px_rgba(0,0,0,0.06)]",
                isDark
                  ? "bg-gradient-to-br from-red-500/20 to-rose-500/20 border-red-500/20"
                  : "bg-gradient-to-br from-red-50 to-rose-50 border-red-200"
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    isDark ? "bg-red-500/20" : "bg-red-100"
                  )}
                >
                  <TrendingDown strokeWidth={1.5} className="h-4 w-4 text-red-600" />
                </div>
                <div className={cn("text-xs font-medium", isDark ? "text-red-400" : "text-red-700")}>
                  Spending
                </div>
              </div>
              <div className={cn("text-xl font-bold", isDark ? "text-red-300" : "text-red-900")}>
                {formatCurrency(metadata.summary.totalSpending)}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={cn(
                "rounded-2xl border p-4 shadow-[0px_2px_6px_rgba(0,0,0,0.06)]",
                isDark
                  ? "bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-blue-500/20"
                  : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    isDark ? "bg-blue-500/20" : "bg-blue-100"
                  )}
                >
                  <DollarSign strokeWidth={1.5} className="h-4 w-4 text-blue-600" />
                </div>
                <div className={cn("text-xs font-medium", isDark ? "text-blue-400" : "text-blue-700")}>
                  Net Flow
                </div>
              </div>
              <div
                className={cn(
                  "text-xl font-bold",
                  metadata.summary.netCashFlow >= 0
                    ? isDark
                      ? "text-green-300"
                      : "text-green-900"
                    : isDark
                    ? "text-red-300"
                    : "text-red-900"
                )}
              >
                {metadata.summary.netCashFlow >= 0 ? "+" : ""}
                {formatCurrency(metadata.summary.netCashFlow)}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={cn(
                "rounded-2xl border p-4 shadow-[0px_2px_6px_rgba(0,0,0,0.06)]",
                isDark
                  ? "bg-gradient-to-br from-purple-500/20 to-violet-500/20 border-purple-500/20"
                  : "bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200"
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    isDark ? "bg-purple-500/20" : "bg-purple-100"
                  )}
                >
                  <Calendar strokeWidth={1.5} className="h-4 w-4 text-purple-600" />
                </div>
                <div className={cn("text-xs font-medium", isDark ? "text-purple-400" : "text-purple-700")}>
                  Pending
                </div>
              </div>
              <div className={cn("text-xl font-bold", isDark ? "text-purple-300" : "text-purple-900")}>
                {metadata.summary.pendingCount}
              </div>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        {metadata && (
          <div
            className={cn(
              "mb-6 flex flex-col gap-3",
              isFullscreen && "md:flex-row md:items-center"
            )}
          >
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                strokeWidth={1.5}
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                  isDark ? "text-white/40" : "text-black/40"
                )}
              />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-9 pr-4 py-2 rounded-lg border text-sm transition-all outline-none ring-0",
                  isDark
                    ? "bg-gray-800 border-white/10 text-white placeholder:text-white/40 focus:border-white/20"
                    : "bg-white border-black/10 text-black placeholder:text-black/40 focus:border-black/20"
                )}
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory || ""}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className={cn(
                "px-4 py-2 rounded-lg border text-sm transition-all outline-none",
                isDark
                  ? "bg-gray-800 border-white/10 text-white focus:border-white/20"
                  : "bg-white border-black/10 text-black focus:border-black/20"
              )}
            >
              <option value="">All Categories</option>
              {metadata.categoryBreakdown.map((cat) => (
                <option key={cat.category} value={cat.category}>
                  {formatCategoryName(cat.category)} ({cat.count})
                </option>
              ))}
            </select>

            {/* Pending Filter */}
            <button
              onClick={() => setShowPendingOnly(!showPendingOnly)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap",
                showPendingOnly
                  ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg"
                  : isDark
                  ? "bg-gray-800 text-white border border-white/10 hover:bg-gray-700"
                  : "bg-white text-black border border-black/10 hover:bg-gray-100"
              )}
            >
              <Filter strokeWidth={1.5} className="h-4 w-4 inline mr-2" />
              {showPendingOnly ? "Show All" : "Pending"}
            </button>
          </div>
        )}

        {/* Transaction List by Date Groups */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className={cn("text-sm", isDark ? "text-white/60" : "text-black/60")}>
              No transactions match your filters
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {(isFullscreen || showAllDates
              ? groupedTransactions
              : groupedTransactions.slice(0, MAX_DATE_GROUPS_INLINE)
            ).map(([date, txs], groupIndex) => (
              <div key={date}>
                {/* Date Header */}
                <div className="mb-3">
                  <h3 className={cn("text-sm font-semibold", isDark ? "text-white/80" : "text-black/80")}>
                    {formatDate(date)}
                  </h3>
                </div>

                {/* Transaction Cards */}
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {(isFullscreen ? txs : txs.slice(0, MAX_VISIBLE_INLINE)).map((tx, txIndex) => {
                      const isExpanded = expandedTx === tx.transaction_id;
                      const merchantName = tx.merchant_name || tx.name || "Unknown";
                      const category = tx.personal_finance_category?.primary || "UNCATEGORIZED";
                      const categoryDetailed =
                        tx.personal_finance_category?.detailed || "Uncategorized";
                      const categoryData = CATEGORY_COLORS[category] || CATEGORY_COLORS.UNCATEGORIZED;
                      const logo = tx.logo_url || tx.counterparties?.[0]?.logo_url;
                      const displayDate = tx.authorized_date || tx.date;

                      return (
                        <motion.div
                          key={tx.transaction_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: (groupIndex * 0.02) + (txIndex * 0.02) }}
                          className={cn(
                            "rounded-2xl border shadow-[0px_2px_6px_rgba(0,0,0,0.06)] cursor-pointer transition-all",
                            isDark
                              ? "bg-gray-800 border-white/10 hover:bg-gray-750"
                              : "bg-white border-black/5 hover:bg-gray-50"
                          )}
                          onClick={() => setExpandedTx(isExpanded ? null : tx.transaction_id)}
                        >
                          {/* Main Row */}
                          <div className="p-4">
                            <div className="flex items-center gap-4">
                              {/* Logo/Icon */}
                              <div className="flex-shrink-0">
                                {logo ? (
                                  <img
                                    src={logo}
                                    alt={merchantName}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-black/5"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                      // Show fallback letter circle
                                      const fallback = document.createElement("div");
                                      fallback.className = "w-12 h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-lg";
                                      fallback.textContent = merchantName.charAt(0).toUpperCase();
                                      e.currentTarget.parentElement?.appendChild(fallback);
                                    }}
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-lg">
                                    {merchantName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              {/* Transaction Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3
                                    className={cn(
                                      "font-semibold truncate",
                                      isDark ? "text-white" : "text-black"
                                    )}
                                  >
                                    {merchantName}
                                  </h3>
                                  {tx.pending && (
                                    <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 text-xs font-medium rounded-full whitespace-nowrap">
                                      Pending
                                    </span>
                                  )}
                                  {tx.payment_channel && (
                                    <span className="text-sm">
                                      {PAYMENT_CHANNEL_ICONS[tx.payment_channel]}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 rounded-full font-medium flex items-center gap-1",
                                      categoryData.bg,
                                      categoryData.text
                                    )}
                                  >
                                    <span>{categoryData.icon}</span>
                                    <span>{formatCategoryName(category)}</span>
                                  </span>
                                </div>
                              </div>

                              {/* Amount */}
                              <div className="text-right flex-shrink-0">
                                <div
                                  className={cn(
                                    "text-lg font-bold",
                                    tx.amount < 0
                                      ? "text-green-600 dark:text-green-400"
                                      : isDark
                                      ? "text-white"
                                      : "text-black"
                                  )}
                                >
                                  {tx.amount < 0
                                    ? `+${formatCurrency(Math.abs(tx.amount), tx.iso_currency_code || "USD")}`
                                    : `-${formatCurrency(tx.amount, tx.iso_currency_code || "USD")}`
                                  }
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details */}
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
                                    "px-4 pb-4 border-t",
                                    isDark ? "border-white/10" : "border-black/5"
                                  )}
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                    {/* Left Column */}
                                    <div className="space-y-3">
                                      <div>
                                        <div
                                          className={cn(
                                            "text-xs font-medium uppercase mb-1",
                                            isDark ? "text-white/60" : "text-black/60"
                                          )}
                                        >
                                          Category
                                        </div>
                                        <div className={cn("text-sm", isDark ? "text-white" : "text-black")}>
                                          {formatCategoryName(categoryDetailed)}
                                        </div>
                                      </div>

                                      {tx.payment_channel && (
                                        <div>
                                          <div
                                            className={cn(
                                              "text-xs font-medium uppercase mb-1",
                                              isDark ? "text-white/60" : "text-black/60"
                                            )}
                                          >
                                            Payment Channel
                                          </div>
                                          <div
                                            className={cn(
                                              "text-sm capitalize",
                                              isDark ? "text-white" : "text-black"
                                            )}
                                          >
                                            {tx.payment_channel}
                                          </div>
                                        </div>
                                      )}

                                      {tx.location?.city && (
                                        <div>
                                          <div
                                            className={cn(
                                              "text-xs font-medium uppercase mb-1",
                                              isDark ? "text-white/60" : "text-black/60"
                                            )}
                                          >
                                            Location
                                          </div>
                                          <div className={cn("text-sm", isDark ? "text-white" : "text-black")}>
                                            {[tx.location.address, tx.location.city, tx.location.region]
                                              .filter(Boolean)
                                              .join(", ")}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Right Column */}
                                    <div className="space-y-3">
                                      {tx.check_number && (
                                        <div>
                                          <div
                                            className={cn(
                                              "text-xs font-medium uppercase mb-1",
                                              isDark ? "text-white/60" : "text-black/60"
                                            )}
                                          >
                                            Check Number
                                          </div>
                                          <div className={cn("text-sm", isDark ? "text-white" : "text-black")}>
                                            #{tx.check_number}
                                          </div>
                                        </div>
                                      )}

                                      {tx.original_description && (
                                        <div>
                                          <div
                                            className={cn(
                                              "text-xs font-medium uppercase mb-1",
                                              isDark ? "text-white/60" : "text-black/60"
                                            )}
                                          >
                                            Bank Description
                                          </div>
                                          <div
                                            className={cn(
                                              "text-sm font-mono",
                                              isDark ? "text-white/80" : "text-black/80"
                                            )}
                                          >
                                            {tx.original_description}
                                          </div>
                                        </div>
                                      )}

                                      {tx.counterparties && tx.counterparties.length > 0 && (
                                        <div>
                                          <div
                                            className={cn(
                                              "text-xs font-medium uppercase mb-1",
                                              isDark ? "text-white/60" : "text-black/60"
                                            )}
                                          >
                                            Counterparty
                                          </div>
                                          <div className={cn("text-sm", isDark ? "text-white" : "text-black")}>
                                            {tx.counterparties[0].name}
                                            {tx.counterparties[0].type && (
                                              <span className={cn("ml-1", isDark ? "text-white/60" : "text-black/60")}>
                                                ({tx.counterparties[0].type})
                                              </span>
                                            )}
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

                  {/* "+# more" indicator for inline mode */}
                  {!isFullscreen && txs.length > MAX_VISIBLE_INLINE && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => window.openai?.requestDisplayMode({ mode: "fullscreen" })}
                      className={cn(
                        "w-full flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition-all cursor-pointer",
                        isDark
                          ? "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                          : "border-black/10 bg-white/40 text-black/60 hover:bg-white/50"
                      )}
                    >
                      +{txs.length - MAX_VISIBLE_INLINE} more
                    </motion.button>
                  )}
                </div>
              </div>
            ))}

            {/* Show More Date Groups Button */}
            {!isFullscreen && !showAllDates && groupedTransactions.length > MAX_DATE_GROUPS_INLINE && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowAllDates(true)}
                className={cn(
                  "w-full flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition-all cursor-pointer",
                  isDark
                    ? "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                    : "border-black/10 bg-white/40 text-black/60 hover:bg-white/50"
                )}
              >
                +{groupedTransactions.length - MAX_DATE_GROUPS_INLINE} more dates
              </motion.button>
            )}
          </div>
        )}

        {/* Results Summary */}
        <div className={cn("mt-6 text-center text-sm", isDark ? "text-white/60" : "text-black/60")}>
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>
      </div>
    </div>
  );
}
