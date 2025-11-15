"use client";

import React, { useState, useMemo } from "react";
import { useWidgetProps } from "@/app/hooks/use-widget-props";
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
const CATEGORY_COLORS: Record<string, string> = {
  FOOD_AND_DRINK: "bg-orange-100 text-orange-800",
  GENERAL_MERCHANDISE: "bg-blue-100 text-blue-800",
  TRANSPORTATION: "bg-purple-100 text-purple-800",
  TRANSFER_IN: "bg-green-100 text-green-800",
  TRANSFER_OUT: "bg-red-100 text-red-800",
  ENTERTAINMENT: "bg-pink-100 text-pink-800",
  TRAVEL: "bg-indigo-100 text-indigo-800",
  GENERAL_SERVICES: "bg-teal-100 text-teal-800",
  RENT_AND_UTILITIES: "bg-yellow-100 text-yellow-800",
  HOME_IMPROVEMENT: "bg-cyan-100 text-cyan-800",
  MEDICAL: "bg-rose-100 text-rose-800",
  BANK_FEES: "bg-gray-100 text-gray-800",
  LOAN_PAYMENTS: "bg-violet-100 text-violet-800",
  INCOME: "bg-emerald-100 text-emerald-800",
  UNCATEGORIZED: "bg-slate-100 text-slate-800",
};

// Payment channel badges
const PAYMENT_CHANNEL_ICONS: Record<string, string> = {
  online: "🌐",
  "in store": "🏪",
  other: "💳",
};

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(Math.abs(amount));
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCategoryName(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export default function Transactions() {
  const rawOutput = useWidgetProps();

  // All hooks must be called before any conditional returns
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

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

  // Now we can do conditional returns after all hooks are called
  // Check if bank connection is required
  if (rawOutput && "message" in rawOutput && rawOutput.message === "Bank connection required") {
    return <PlaidRequired />;
  }

  if (!toolOutput || !toolOutput.transactions) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No transactions available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header with Summary */}
      {metadata && (
        <div className="bg-white border-b border-slate-200 p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Transactions</h2>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm font-medium text-green-700">Income</div>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(metadata.summary.totalIncome)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg p-4 border border-red-200">
              <div className="text-sm font-medium text-red-700">Spending</div>
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(metadata.summary.totalSpending)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm font-medium text-blue-700">Net Cash Flow</div>
              <div
                className={`text-2xl font-bold ${
                  metadata.summary.netCashFlow >= 0 ? "text-green-900" : "text-red-900"
                }`}
              >
                {metadata.summary.netCashFlow >= 0 ? "+" : ""}
                {formatCurrency(metadata.summary.netCashFlow)}
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
              <div className="text-sm font-medium text-purple-700">Pending</div>
              <div className="text-2xl font-bold text-purple-900">
                {metadata.summary.pendingCount}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by merchant or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory || ""}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showPendingOnly
                  ? "bg-purple-600 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              {showPendingOnly ? "Show All" : "Pending Only"}
            </button>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No transactions match your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredTransactions.map((tx) => {
                const isExpanded = expandedTx === tx.transaction_id;
                const merchantName = tx.merchant_name || tx.name || "Unknown";
                const category = tx.personal_finance_category?.primary || "UNCATEGORIZED";
                const categoryDetailed =
                  tx.personal_finance_category?.detailed || "Uncategorized";
                const logo = tx.logo_url || tx.counterparties?.[0]?.logo_url;
                const website = tx.website || tx.counterparties?.[0]?.website;
                const displayDate = tx.authorized_date || tx.date;

                return (
                  <div
                    key={tx.transaction_id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* Main Transaction Row */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() =>
                        setExpandedTx(isExpanded ? null : tx.transaction_id)
                      }
                    >
                      <div className="flex items-center gap-4">
                        {/* Logo/Icon */}
                        <div className="flex-shrink-0">
                          {logo ? (
                            <img
                              src={logo}
                              alt={merchantName}
                              className="w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold text-lg">
                              {merchantName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Transaction Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 truncate">
                              {merchantName}
                            </h3>
                            {tx.pending && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                Pending
                              </span>
                            )}
                            {tx.payment_channel && (
                              <span className="text-sm">
                                {PAYMENT_CHANNEL_ICONS[tx.payment_channel]}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span>{formatDate(displayDate)}</span>
                            <span>•</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                CATEGORY_COLORS[category] || CATEGORY_COLORS.UNCATEGORIZED
                              }`}
                            >
                              {formatCategoryName(category)}
                            </span>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right flex-shrink-0">
                          <div
                            className={`text-lg font-bold ${
                              tx.amount < 0 ? "text-green-600" : "text-slate-900"
                            }`}
                          >
                            {tx.amount < 0 ? "+" : "-"}
                            {formatCurrency(
                              tx.amount,
                              tx.iso_currency_code || "USD"
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 bg-slate-50 border-t border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                          {/* Left Column */}
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                Category
                              </div>
                              <div className="text-sm text-slate-900">
                                {formatCategoryName(categoryDetailed)}
                              </div>
                            </div>

                            {tx.payment_channel && (
                              <div>
                                <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                  Payment Channel
                                </div>
                                <div className="text-sm text-slate-900 capitalize">
                                  {tx.payment_channel}
                                </div>
                              </div>
                            )}

                            {tx.location?.city && (
                              <div>
                                <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                  Location
                                </div>
                                <div className="text-sm text-slate-900">
                                  {[
                                    tx.location.address,
                                    tx.location.city,
                                    tx.location.region,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")}
                                </div>
                              </div>
                            )}

                            {website && (
                              <div>
                                <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                  Website
                                </div>
                                <a
                                  href={website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                                >
                                  {website}
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Right Column */}
                          <div className="space-y-3">
                            {tx.check_number && (
                              <div>
                                <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                  Check Number
                                </div>
                                <div className="text-sm text-slate-900">
                                  #{tx.check_number}
                                </div>
                              </div>
                            )}

                            {tx.original_description && (
                              <div>
                                <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                  Bank Description
                                </div>
                                <div className="text-sm text-slate-600 font-mono">
                                  {tx.original_description}
                                </div>
                              </div>
                            )}

                            {tx.payment_meta?.reference_number && (
                              <div>
                                <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                  Reference Number
                                </div>
                                <div className="text-sm text-slate-900 font-mono">
                                  {tx.payment_meta.reference_number}
                                </div>
                              </div>
                            )}

                            {tx.counterparties && tx.counterparties.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                  Counterparty
                                </div>
                                <div className="text-sm text-slate-900">
                                  {tx.counterparties[0].name}
                                  {tx.counterparties[0].type && (
                                    <span className="text-slate-500 ml-1">
                                      ({tx.counterparties[0].type})
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mt-4 text-center text-sm text-slate-600">
          Showing {filteredTransactions.length} of {transactions.length} transactions
          {toolOutput.dateRange && (
            <span className="ml-2">
              ({formatDate(toolOutput.dateRange.start)} -{" "}
              {formatDate(toolOutput.dateRange.end)})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
