"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, CreditCard, GraduationCap, Home, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useWidgetProps } from "@/src/use-widget-props";
import { useOpenAiGlobal } from "@/src/use-openai-global";
import { useWidgetState } from "@/src/use-widget-state";
import { useDisplayMode } from "@/src/use-display-mode";
import { useMaxHeight } from "@/src/use-max-height";
import { useTheme } from "@/src/use-theme";
import { formatCurrency, formatDate, formatPercent } from "@/src/utils/format";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";

// Type definitions for comprehensive liability data
interface Account {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string;
  mask: string | null;
  balances: {
    current: number | null;
    available: number | null;
    limit: number | null;
    iso_currency_code: string;
  };
}

interface CreditCard {
  account_id: string;
  aprs: Array<{
    apr_percentage: number;
    apr_type: string;
    balance_subject_to_apr: number | null;
    interest_charge_amount: number | null;
  }>;
  is_overdue: boolean | null;
  last_payment_amount: number | null;
  last_payment_date: string | null;
  last_statement_issue_date: string | null;
  last_statement_balance: number | null;
  minimum_payment_amount: number | null;
  next_payment_due_date: string | null;
}

interface StudentLoan {
  account_id: string;
  account_number: string | null;
  disbursement_dates: string[] | null;
  expected_payoff_date: string | null;
  guarantor: string | null;
  interest_rate_percentage: number;
  is_overdue: boolean | null;
  last_payment_amount: number | null;
  last_payment_date: string | null;
  last_statement_issue_date: string | null;
  loan_name: string | null;
  loan_status: {
    end_date: string | null;
    type: string | null;
  };
  minimum_payment_amount: number | null;
  next_payment_due_date: string | null;
  origination_date: string | null;
  origination_principal_amount: number | null;
  outstanding_interest_amount: number | null;
  payment_reference_number: string | null;
  pslf_status: {
    estimated_eligibility_date: string | null;
    payments_made: number | null;
    payments_remaining: number | null;
  } | null;
  repayment_plan: {
    description: string | null;
    type: string | null;
  };
  servicer_address: {
    city: string | null;
    country: string | null;
    postal_code: string | null;
    region: string | null;
    street: string | null;
  };
  ytd_interest_paid: number | null;
  ytd_principal_paid: number | null;
}

interface Mortgage {
  account_id: string;
  account_number: string | null;
  current_late_fee: number | null;
  escrow_balance: number | null;
  has_pmi: boolean | null;
  has_prepayment_penalty: boolean | null;
  interest_rate: {
    percentage: number | null;
    type: string | null;
  };
  last_payment_amount: number | null;
  last_payment_date: string | null;
  loan_type_description: string | null;
  loan_term: string | null;
  maturity_date: string | null;
  next_monthly_payment: number | null;
  next_payment_due_date: string | null;
  origination_date: string | null;
  origination_principal_amount: number | null;
  past_due_amount: number | null;
  property_address: {
    city: string | null;
    country: string | null;
    postal_code: string | null;
    region: string | null;
    street: string | null;
  };
  ytd_interest_paid: number | null;
  ytd_principal_paid: number | null;
}

interface Summary {
  totalDebt: number;
  totalMinimumPayment: number;
  accountsOverdue: number;
  nextPaymentDue: string | null;
}

interface ToolOutput extends Record<string, unknown> {
  summary?: Summary;
  featureName?: string;
  message?: string;
  error_message?: string;
}

interface ToolMetadata {
  accounts: Account[];
  credit: CreditCard[];
  student: StudentLoan[];
  mortgage: Mortgage[];
}

interface LiabilitiesUIState extends Record<string, unknown> {
  expandedIds: string[];
}

function getDaysUntil(dateString: string | null) {
  if (!dateString) return null;
  const today = new Date();
  const targetDate = new Date(dateString);
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default function Liabilities() {
  const toolOutput = useWidgetProps<ToolOutput>();
  const toolMetadata = useOpenAiGlobal("toolResponseMetadata") as ToolMetadata | null;
  const [uiState, setUiState] = useWidgetState<LiabilitiesUIState>({
    expandedIds: [],
  });

  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const theme = useTheme();
  const isFullscreen = displayMode === "fullscreen";
  const isDark = theme === "dark";

  // Max visible items per category in inline mode
  const MAX_VISIBLE_INLINE = 3;

  const toggleExpanded = (id: string) => {
    setUiState(prevState => {
      const expanded = new Set(prevState.expandedIds);
      if (expanded.has(id)) {
        expanded.delete(id);
      } else {
        expanded.add(id);
      }
      return { ...prevState, expandedIds: Array.from(expanded) };
    });
  };

  // Check for auth requirements
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
          No liability data available
        </p>
      </div>
    );
  }

  const accounts: Account[] = toolMetadata?.accounts || [];
  const credit: CreditCard[] = toolMetadata?.credit || [];
  const student: StudentLoan[] = toolMetadata?.student || [];
  const mortgage: Mortgage[] = toolMetadata?.mortgage || [];
  const summary = toolOutput?.summary;

  // Create account lookup
  const accountMap = new Map<string, Account>(
    accounts.map((acc: Account) => [acc.account_id, acc])
  );

  const totalLiabilities = credit.length + student.length + mortgage.length;

  if (totalLiabilities === 0) {
    return (
      <div
        className={cn(
          "antialiased w-full relative flex items-center justify-center",
          isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-black"
        )}
        style={{ maxHeight: maxHeight ?? undefined }}
      >
        <div className="text-center p-8">
          <div className="text-5xl mb-4">💳</div>
          <div className={cn("text-lg font-semibold mb-2", isDark ? "text-white" : "text-black")}>
            No liabilities found
          </div>
          <p className={cn("text-sm", isDark ? "text-white/60" : "text-black/60")}>
            No credit cards, loans, or mortgages detected
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
            Liabilities
          </h1>
          <p className={cn("text-sm", isDark ? "text-white/60" : "text-black/60")}>
            Your debts and credit overview
          </p>
        </div>

        {/* Summary Header */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-2xl border p-6 shadow-[0px_2px_6px_rgba(0,0,0,0.06)] mb-6",
              isDark
                ? "bg-gradient-to-br from-red-500/20 to-rose-500/20 border-red-500/20"
                : "bg-gradient-to-br from-red-50 to-rose-50 border-red-200"
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={cn(
                  "p-3 rounded-xl",
                  isDark ? "bg-red-500/30" : "bg-red-100"
                )}
              >
                <DollarSign strokeWidth={1.5} className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className={cn("text-sm font-medium mb-1", isDark ? "text-red-300" : "text-red-700")}>
                  Total Debt
                </div>
                <div className={cn("text-3xl font-bold", isDark ? "text-white" : "text-black")}>
                  {formatCurrency(summary.totalDebt)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div
                className={cn(
                  "rounded-xl p-3",
                  isDark ? "bg-red-500/10" : "bg-white"
                )}
              >
                <div className={cn("text-xs font-medium mb-1", isDark ? "text-white/60" : "text-black/60")}>
                  Min Payment
                </div>
                <div className={cn("text-lg font-semibold", isDark ? "text-white" : "text-black")}>
                  {formatCurrency(summary.totalMinimumPayment)}
                </div>
              </div>
              <div
                className={cn(
                  "rounded-xl p-3",
                  isDark ? "bg-red-500/10" : "bg-white"
                )}
              >
                <div className={cn("text-xs font-medium mb-1", isDark ? "text-white/60" : "text-black/60")}>
                  Total Accounts
                </div>
                <div className={cn("text-lg font-semibold", isDark ? "text-white" : "text-black")}>
                  {totalLiabilities}
                </div>
              </div>
              {summary.accountsOverdue > 0 ? (
                <div
                  className={cn(
                    "rounded-xl p-3",
                    isDark ? "bg-yellow-500/20 border border-yellow-500/30" : "bg-yellow-50 border border-yellow-200"
                  )}
                >
                  <div className={cn("text-xs font-medium mb-1", isDark ? "text-yellow-400" : "text-yellow-700")}>
                    ⚠️ Overdue
                  </div>
                  <div className={cn("text-lg font-semibold", isDark ? "text-yellow-300" : "text-yellow-900")}>
                    {summary.accountsOverdue}
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "rounded-xl p-3",
                    isDark ? "bg-green-500/20 border border-green-500/30" : "bg-green-50 border border-green-200"
                  )}
                >
                  <div className={cn("text-xs font-medium mb-1", isDark ? "text-green-400" : "text-green-700")}>
                    ✓ Status
                  </div>
                  <div className={cn("text-sm font-semibold", isDark ? "text-green-300" : "text-green-900")}>
                    All Current
                  </div>
                </div>
              )}
            </div>

            {summary.nextPaymentDue && (
              <div className={cn("mt-4 text-sm", isDark ? "text-white/80" : "text-black/80")}>
                Next payment due:{" "}
                <strong>{formatDate(summary.nextPaymentDue)}</strong>
                {(() => {
                  const days = getDaysUntil(summary.nextPaymentDue);
                  if (days !== null) {
                    return days < 0
                      ? ` (${Math.abs(days)} days overdue)`
                      : days === 0
                      ? " (due today)"
                      : ` (in ${days} days)`;
                  }
                  return "";
                })()}
              </div>
            )}
          </motion.div>
        )}

        {/* Liabilities List */}
        <div className="space-y-4">
          {/* Credit Cards */}
          {(isFullscreen ? credit : credit.slice(0, MAX_VISIBLE_INLINE)).map((card: CreditCard, index: number) => {
            const account = accountMap.get(card.account_id);
            if (!account) return null;

            const balance = Math.abs(account.balances.current || 0);
            const limit = account.balances.limit || 0;
            const utilization = limit > 0 ? (balance / limit) * 100 : 0;
            const daysUntilDue = getDaysUntil(card.next_payment_due_date);
            const isExpanded = uiState.expandedIds.includes(card.account_id);

            return (
              <motion.div
                key={card.account_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "rounded-2xl border shadow-[0px_2px_6px_rgba(0,0,0,0.06)] overflow-hidden",
                  isDark ? "bg-gray-800 border-white/10" : "bg-white border-black/5"
                )}
              >
                <div
                  className={cn(
                    "p-4 cursor-pointer transition-colors",
                    isDark ? "hover:bg-gray-750" : "hover:bg-gray-50"
                  )}
                  onClick={() => toggleExpanded(card.account_id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          isDark ? "bg-blue-500/20" : "bg-blue-100"
                        )}
                      >
                        <CreditCard strokeWidth={1.5} className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className={cn("font-semibold", isDark ? "text-white" : "text-black")}>
                          {account.name}
                        </h3>
                        <p className={cn("text-sm", isDark ? "text-white/60" : "text-black/60")}>
                          Credit Card{account.mask && ` • ****${account.mask}`}
                        </p>
                      </div>
                    </div>
                    {card.is_overdue && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded">
                        OVERDUE
                      </span>
                    )}
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className={cn(isDark ? "text-white/60" : "text-black/60")}>Balance</span>
                      <span className={cn("font-bold", isDark ? "text-white" : "text-black")}>
                        {formatCurrency(balance)}
                      </span>
                    </div>
                    {limit > 0 && (
                      <>
                        <div
                          className={cn(
                            "h-2 rounded-full overflow-hidden",
                            isDark ? "bg-gray-700" : "bg-gray-200"
                          )}
                        >
                          <div
                            className={cn(
                              "h-full transition-all",
                              utilization > 80
                                ? "bg-gradient-to-r from-red-500 to-red-600"
                                : utilization > 50
                                ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
                                : "bg-gradient-to-r from-green-500 to-green-600"
                            )}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                        <div className={cn("text-xs mt-1", isDark ? "text-white/60" : "text-black/60")}>
                          {formatPercent(utilization / 100)} of {formatCurrency(limit)} limit
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className={cn("block", isDark ? "text-white/60" : "text-black/60")}>
                        Min Payment
                      </span>
                      <span className={cn("font-semibold", isDark ? "text-white" : "text-black")}>
                        {formatCurrency(card.minimum_payment_amount || 0)}
                      </span>
                    </div>
                    <div>
                      <span className={cn("block", isDark ? "text-white/60" : "text-black/60")}>Due Date</span>
                      <span
                        className={cn(
                          "font-semibold",
                          daysUntilDue !== null && daysUntilDue < 7
                            ? "text-red-500"
                            : isDark
                            ? "text-white"
                            : "text-black"
                        )}
                      >
                        {card.next_payment_due_date ? formatDate(card.next_payment_due_date) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && card.aprs && card.aprs.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        className={cn(
                          "px-4 pb-4 border-t space-y-2",
                          isDark ? "border-white/10" : "border-black/5"
                        )}
                      >
                        <div className={cn("text-xs font-semibold uppercase pt-3", isDark ? "text-white/60" : "text-black/60")}>
                          APR Breakdown
                        </div>
                        {card.aprs.map((apr, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "flex justify-between items-center p-2 rounded-lg text-xs",
                              isDark ? "bg-gray-700/50" : "bg-gray-100"
                            )}
                          >
                            <span className={cn("capitalize", isDark ? "text-white" : "text-black")}>
                              {apr.apr_type.replace(/_/g, " ")}
                            </span>
                            <span className={cn("font-bold", isDark ? "text-white" : "text-black")}>
                              {formatPercent(apr.apr_percentage / 100)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* "+# more" for credit cards in inline mode */}
          {!isFullscreen && credit.length > MAX_VISIBLE_INLINE && (
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
              +{credit.length - MAX_VISIBLE_INLINE} more credit cards
            </motion.button>
          )}

          {/* Student Loans */}
          {(isFullscreen ? student : student.slice(0, MAX_VISIBLE_INLINE)).map((loan: StudentLoan, index: number) => {
            const account = accountMap.get(loan.account_id);
            if (!account) return null;

            const balance = account.balances.current || 0;

            return (
              <motion.div
                key={loan.account_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (credit.length + index) * 0.05 }}
                className={cn(
                  "rounded-2xl border shadow-[0px_2px_6px_rgba(0,0,0,0.06)]",
                  isDark ? "bg-gray-800 border-white/10" : "bg-white border-black/5"
                )}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          isDark ? "bg-purple-500/20" : "bg-purple-100"
                        )}
                      >
                        <GraduationCap strokeWidth={1.5} className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className={cn("font-semibold", isDark ? "text-white" : "text-black")}>
                          {loan.loan_name || account.name}
                        </h3>
                        <p className={cn("text-sm", isDark ? "text-white/60" : "text-black/60")}>
                          Student Loan
                        </p>
                      </div>
                    </div>
                    {loan.is_overdue && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded">
                        OVERDUE
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className={cn("block mb-1", isDark ? "text-white/60" : "text-black/60")}>
                        Balance
                      </span>
                      <span className={cn("font-bold text-base", isDark ? "text-white" : "text-black")}>
                        {formatCurrency(balance)}
                      </span>
                    </div>
                    <div>
                      <span className={cn("block mb-1", isDark ? "text-white/60" : "text-black/60")}>
                        Interest Rate
                      </span>
                      <span className={cn("font-bold text-base", isDark ? "text-white" : "text-black")}>
                        {formatPercent(loan.interest_rate_percentage / 100)}
                      </span>
                    </div>
                    <div>
                      <span className={cn("block mb-1", isDark ? "text-white/60" : "text-black/60")}>
                        Min Payment
                      </span>
                      <span className={cn("font-semibold", isDark ? "text-white" : "text-black")}>
                        {formatCurrency(loan.minimum_payment_amount || 0)}
                      </span>
                    </div>
                    <div>
                      <span className={cn("block mb-1", isDark ? "text-white/60" : "text-black/60")}>
                        Due Date
                      </span>
                      <span className={cn("font-semibold", isDark ? "text-white" : "text-black")}>
                        {loan.next_payment_due_date ? formatDate(loan.next_payment_due_date) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* "+# more" for student loans in inline mode */}
          {!isFullscreen && student.length > MAX_VISIBLE_INLINE && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (credit.length + MAX_VISIBLE_INLINE) * 0.05 }}
              onClick={() => window.openai?.requestDisplayMode({ mode: "fullscreen" })}
              className={cn(
                "w-full flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition-all cursor-pointer",
                isDark
                  ? "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  : "border-black/10 bg-white/40 text-black/60 hover:bg-white/50"
              )}
            >
              +{student.length - MAX_VISIBLE_INLINE} more student loans
            </motion.button>
          )}

          {/* Mortgages */}
          {(isFullscreen ? mortgage : mortgage.slice(0, MAX_VISIBLE_INLINE)).map((mtg: Mortgage, index: number) => {
            const account = accountMap.get(mtg.account_id);
            if (!account) return null;

            const balance = account.balances.current || 0;

            return (
              <motion.div
                key={mtg.account_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (credit.length + student.length + index) * 0.05 }}
                className={cn(
                  "rounded-2xl border shadow-[0px_2px_6px_rgba(0,0,0,0.06)]",
                  isDark ? "bg-gray-800 border-white/10" : "bg-white border-black/5"
                )}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          isDark ? "bg-green-500/20" : "bg-green-100"
                        )}
                      >
                        <Home strokeWidth={1.5} className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className={cn("font-semibold", isDark ? "text-white" : "text-black")}>
                          {account.name}
                        </h3>
                        <p className={cn("text-sm", isDark ? "text-white/60" : "text-black/60")}>
                          Mortgage
                        </p>
                      </div>
                    </div>
                    {mtg.past_due_amount && mtg.past_due_amount > 0 && (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded">
                        PAST DUE
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className={cn("block mb-1", isDark ? "text-white/60" : "text-black/60")}>
                        Balance
                      </span>
                      <span className={cn("font-bold text-base", isDark ? "text-white" : "text-black")}>
                        {formatCurrency(balance)}
                      </span>
                    </div>
                    <div>
                      <span className={cn("block mb-1", isDark ? "text-white/60" : "text-black/60")}>
                        Interest Rate
                      </span>
                      <span className={cn("font-bold text-base", isDark ? "text-white" : "text-black")}>
                        {formatPercent((mtg.interest_rate.percentage || 0) / 100)}
                      </span>
                    </div>
                    <div>
                      <span className={cn("block mb-1", isDark ? "text-white/60" : "text-black/60")}>
                        Monthly Payment
                      </span>
                      <span className={cn("font-semibold", isDark ? "text-white" : "text-black")}>
                        {formatCurrency(mtg.next_monthly_payment || 0)}
                      </span>
                    </div>
                    <div>
                      <span className={cn("block mb-1", isDark ? "text-white/60" : "text-black/60")}>
                        Due Date
                      </span>
                      <span className={cn("font-semibold", isDark ? "text-white" : "text-black")}>
                        {mtg.next_payment_due_date ? formatDate(mtg.next_payment_due_date) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {mtg.loan_term && (
                    <div className={cn("mt-3 pt-3 border-t text-xs", isDark ? "border-white/10" : "border-black/5")}>
                      <span className={cn("block mb-1", isDark ? "text-white/60" : "text-black/60")}>
                        Loan Term
                      </span>
                      <span className={cn("font-semibold", isDark ? "text-white" : "text-black")}>
                        {mtg.loan_term}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* "+# more" for mortgages in inline mode */}
          {!isFullscreen && mortgage.length > MAX_VISIBLE_INLINE && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (credit.length + student.length + MAX_VISIBLE_INLINE) * 0.05 }}
              onClick={() => window.openai?.requestDisplayMode({ mode: "fullscreen" })}
              className={cn(
                "w-full flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition-all cursor-pointer",
                isDark
                  ? "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  : "border-black/10 bg-white/40 text-black/60 hover:bg-white/50"
              )}
            >
              +{mortgage.length - MAX_VISIBLE_INLINE} more mortgages
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
