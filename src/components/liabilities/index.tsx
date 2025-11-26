"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";
import {
  Expand,
  CreditCard,
  Graduate,
  Home,
  Paid,
  Warning,
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
import { formatCurrency, formatDate, formatPercent } from "@/src/utils/format";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";
import WidgetLoadingSkeleton from "@/src/components/shared/widget-loading-skeleton";

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
  const isFullscreen = displayMode === "fullscreen";

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

  // Show loading state while waiting for tool output
  if (!toolOutput) {
    return <WidgetLoadingSkeleton />;
  }

  if (!toolMetadata && !toolOutput.summary) {
    return (
      <EmptyMessage>
        <EmptyMessage.Title>No liability data available</EmptyMessage.Title>
      </EmptyMessage>
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
      <EmptyMessage>
        <EmptyMessage.Icon color="secondary">
          <CreditCard />
        </EmptyMessage.Icon>
        <EmptyMessage.Title>No liabilities found</EmptyMessage.Title>
        <EmptyMessage.Description>No credit cards, loans, or mortgages detected</EmptyMessage.Description>
      </EmptyMessage>
    );
  }

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
            Liabilities
          </h1>
          <p className="text-sm text-secondary">
            Your debts and credit overview
          </p>
        </div>

        {/* Summary Header */}
        {summary && (
          <AnimateLayout>
            <div key="summary" className="rounded-2xl border-none p-6 shadow-none mb-6 bg-danger-soft">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-danger-surface">
                  <Paid strokeWidth={1.5} className="h-6 w-6 text-danger" />
                </div>
                <div>
                  <div className="text-sm font-medium mb-1 text-danger-soft uppercase tracking-wide">
                    Total Debt
                  </div>
                  <div className="text-3xl font-bold text-default">
                    {formatCurrency(summary.totalDebt)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="rounded-xl p-3 bg-danger-surface">
                  <div className="text-xs font-medium mb-1 text-secondary uppercase tracking-wide">
                    Min Payment
                  </div>
                  <div className="text-lg font-semibold text-default">
                    {formatCurrency(summary.totalMinimumPayment)}
                  </div>
                </div>
                <div className="rounded-xl p-3 bg-danger-surface">
                  <div className="text-xs font-medium mb-1 text-secondary uppercase tracking-wide">
                    Total Accounts
                  </div>
                  <div className="text-lg font-semibold text-default">
                    {totalLiabilities}
                  </div>
                </div>
                {summary.accountsOverdue > 0 ? (
                  <div className="rounded-xl p-3 bg-warning-soft border border-warning-surface">
                    <div className="text-xs font-medium mb-1 text-warning uppercase tracking-wide">
                      <Warning className="inline h-3 w-3 mr-1" />
                      Overdue
                    </div>
                    <div className="text-lg font-semibold text-warning">
                      {summary.accountsOverdue}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl p-3 bg-success-soft border border-success-surface">
                    <div className="text-xs font-medium mb-1 text-success uppercase tracking-wide">
                      ✓ Status
                    </div>
                    <div className="text-sm font-semibold text-success">
                      All Current
                    </div>
                  </div>
                )}
              </div>

              {summary.nextPaymentDue && (
                <div className="mt-4 text-sm text-secondary">
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
            </div>
          </AnimateLayout>
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
              <AnimateLayout key={card.account_id}>
                <div key={card.account_id} className="rounded-2xl border border-subtle shadow-hairline overflow-hidden bg-surface">
                  <div
                    className="p-4 cursor-pointer transition-colors hover:bg-surface-secondary"
                    onClick={() => toggleExpanded(card.account_id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-info-soft">
                          <CreditCard strokeWidth={1.5} className="h-5 w-5 text-info" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-default">
                            {account.name}
                          </h3>
                          <p className="text-sm text-secondary">
                            Credit Card{account.mask && ` • ****${account.mask}`}
                          </p>
                        </div>
                      </div>
                      {card.is_overdue && (
                        <span className="px-2 py-1 bg-danger-soft text-danger text-xs font-bold rounded">
                          OVERDUE
                        </span>
                      )}
                    </div>

                    <div className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-secondary">Balance</span>
                        <span className="font-bold text-default">
                          {formatCurrency(balance)}
                        </span>
                      </div>
                      {limit > 0 && (
                        <>
                          <div className="h-2 rounded-full overflow-hidden bg-surface-tertiary">
                            <div
                              className={cn(
                                "h-full transition-all",
                                utilization > 80
                                  ? "bg-danger"
                                  : utilization > 50
                                  ? "bg-warning"
                                  : "bg-success"
                              )}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs mt-1 text-secondary">
                            {formatPercent(utilization / 100)} of {formatCurrency(limit)} limit
                          </div>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="block text-secondary uppercase tracking-wide">
                          Min Payment
                        </span>
                        <span className="font-semibold text-default">
                          {formatCurrency(card.minimum_payment_amount || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-secondary uppercase tracking-wide">Due Date</span>
                        <span
                          className={cn(
                            "font-semibold",
                            daysUntilDue !== null && daysUntilDue < 7
                              ? "text-danger"
                              : "text-default"
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
                      <div className="px-4 pb-4 border-t border-subtle space-y-2">
                        <div className="text-xs font-semibold uppercase pt-3 text-secondary">
                          APR Breakdown
                        </div>
                        {card.aprs.map((apr, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center p-2 rounded-lg text-xs bg-surface-secondary"
                          >
                            <span className="capitalize text-default">
                              {apr.apr_type.replace(/_/g, " ")}
                            </span>
                            <span className="font-bold text-default">
                              {formatPercent(apr.apr_percentage / 100)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </AnimateLayout>
            );
          })}

          {/* "+# more" for credit cards in inline mode */}
          {!isFullscreen && credit.length > MAX_VISIBLE_INLINE && (
            <Button
              variant="outline"
              color="secondary"
              className="w-full"
              onClick={() => window.openai?.requestDisplayMode({ mode: "fullscreen" })}
            >
              +{credit.length - MAX_VISIBLE_INLINE} more credit cards
            </Button>
          )}

          {/* Student Loans */}
          {(isFullscreen ? student : student.slice(0, MAX_VISIBLE_INLINE)).map((loan: StudentLoan, index: number) => {
            const account = accountMap.get(loan.account_id);
            if (!account) return null;

            const balance = account.balances.current || 0;

            return (
              <AnimateLayout key={loan.account_id}>
                <div key={loan.account_id} className="rounded-2xl border border-subtle shadow-hairline bg-surface">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-discovery-soft">
                          <Graduate strokeWidth={1.5} className="h-5 w-5 text-discovery" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-default">
                            {loan.loan_name || account.name}
                          </h3>
                          <p className="text-sm text-secondary">
                            Student Loan
                          </p>
                        </div>
                      </div>
                      {loan.is_overdue && (
                        <span className="px-2 py-1 bg-danger-soft text-danger text-xs font-bold rounded">
                          OVERDUE
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="block mb-1 text-secondary uppercase tracking-wide">
                          Balance
                        </span>
                        <span className="font-bold text-base text-default">
                          {formatCurrency(balance)}
                        </span>
                      </div>
                      <div>
                        <span className="block mb-1 text-secondary uppercase tracking-wide">
                          Interest Rate
                        </span>
                        <span className="font-bold text-base text-default">
                          {formatPercent(loan.interest_rate_percentage / 100)}
                        </span>
                      </div>
                      <div>
                        <span className="block mb-1 text-secondary uppercase tracking-wide">
                          Min Payment
                        </span>
                        <span className="font-semibold text-default">
                          {formatCurrency(loan.minimum_payment_amount || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="block mb-1 text-secondary uppercase tracking-wide">
                          Due Date
                        </span>
                        <span className="font-semibold text-default">
                          {loan.next_payment_due_date ? formatDate(loan.next_payment_due_date) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimateLayout>
            );
          })}

          {/* "+# more" for student loans in inline mode */}
          {!isFullscreen && student.length > MAX_VISIBLE_INLINE && (
            <Button
              variant="outline"
              color="secondary"
              className="w-full"
              onClick={() => window.openai?.requestDisplayMode({ mode: "fullscreen" })}
            >
              +{student.length - MAX_VISIBLE_INLINE} more student loans
            </Button>
          )}

          {/* Mortgages */}
          {(isFullscreen ? mortgage : mortgage.slice(0, MAX_VISIBLE_INLINE)).map((mtg: Mortgage, index: number) => {
            const account = accountMap.get(mtg.account_id);
            if (!account) return null;

            const balance = account.balances.current || 0;

            return (
              <AnimateLayout key={mtg.account_id}>
                <div key={mtg.account_id} className="rounded-2xl border border-subtle shadow-hairline bg-surface">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-success-soft">
                          <Home strokeWidth={1.5} className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-default">
                            {account.name}
                          </h3>
                          <p className="text-sm text-secondary">
                            Mortgage
                          </p>
                        </div>
                      </div>
                      {mtg.past_due_amount && mtg.past_due_amount > 0 && (
                        <span className="px-2 py-1 bg-danger-soft text-danger text-xs font-bold rounded">
                          PAST DUE
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="block mb-1 text-secondary uppercase tracking-wide">
                          Balance
                        </span>
                        <span className="font-bold text-base text-default">
                          {formatCurrency(balance)}
                        </span>
                      </div>
                      <div>
                        <span className="block mb-1 text-secondary uppercase tracking-wide">
                          Interest Rate
                        </span>
                        <span className="font-bold text-base text-default">
                          {formatPercent((mtg.interest_rate.percentage || 0) / 100)}
                        </span>
                      </div>
                      <div>
                        <span className="block mb-1 text-secondary uppercase tracking-wide">
                          Monthly Payment
                        </span>
                        <span className="font-semibold text-default">
                          {formatCurrency(mtg.next_monthly_payment || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="block mb-1 text-secondary uppercase tracking-wide">
                          Due Date
                        </span>
                        <span className="font-semibold text-default">
                          {mtg.next_payment_due_date ? formatDate(mtg.next_payment_due_date) : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {mtg.loan_term && (
                      <div className="mt-3 pt-3 border-t border-subtle text-xs">
                        <span className="block mb-1 text-secondary uppercase tracking-wide">
                          Loan Term
                        </span>
                        <span className="font-semibold text-default">
                          {mtg.loan_term}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </AnimateLayout>
            );
          })}

          {/* "+# more" for mortgages in inline mode */}
          {!isFullscreen && mortgage.length > MAX_VISIBLE_INLINE && (
            <Button
              variant="outline"
              color="secondary"
              className="w-full"
              onClick={() => window.openai?.requestDisplayMode({ mode: "fullscreen" })}
            >
              +{mortgage.length - MAX_VISIBLE_INLINE} more mortgages
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
