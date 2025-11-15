"use client";

import React, { useState } from "react";
import { useWidgetProps } from "@/app/hooks/use-widget-props";
import PlaidRequired from "@/src/components/plaid-required";
import SubscriptionRequired from "@/src/components/subscription-required";

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

interface ToolOutput {
  accounts?: Account[];
  credit?: CreditCard[];
  student?: StudentLoan[];
  mortgage?: Mortgage[];
  summary?: Summary;
  featureName?: string;
  message?: string;
  error_message?: string;
}

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
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
  const toolOutput = useWidgetProps();
  const [activeTab, setActiveTab] = useState<'overview' | 'credit' | 'student' | 'mortgage'>('overview');

  if (!toolOutput) {
    return <p>No liability data available</p>;
  }

  // Check for auth/subscription requirements
  if (toolOutput.message === 'Bank connection required') {
    return <PlaidRequired />;
  }

  if (toolOutput.error_message === 'Subscription required' || toolOutput.featureName) {
    return <SubscriptionRequired />;
  }

  const accounts: Account[] = (toolOutput.accounts || []) as Account[];
  const credit: CreditCard[] = (toolOutput.credit || []) as CreditCard[];
  const student: StudentLoan[] = (toolOutput.student || []) as StudentLoan[];
  const mortgage: Mortgage[] = (toolOutput.mortgage || []) as Mortgage[];
  const summary = toolOutput.summary;

  // Create account lookup
  const accountMap = new Map<string, Account>(
    accounts.map((acc: Account) => [acc.account_id, acc])
  );

  const totalLiabilities = credit.length + student.length + mortgage.length;

  if (totalLiabilities === 0) {
    return (
      <div className="liabilities-container">
        <div className="no-data">
          <div className="no-data-icon">💳</div>
          <div className="no-data-text">No liabilities found</div>
          <div className="no-data-subtext">No credit cards, loans, or mortgages detected in your linked accounts.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="liabilities-container">
      {/* Summary Header */}
      <div className="summary-header">
        <div className="summary-main">
          <div className="summary-label">Total Debt</div>
          <div className="summary-amount">{formatCurrency(summary?.totalDebt || 0)}</div>
        </div>
        <div className="summary-grid">
          <div className="summary-stat">
            <div className="stat-label">Minimum Payment</div>
            <div className="stat-value">{formatCurrency(summary?.totalMinimumPayment || 0)}</div>
          </div>
          <div className="summary-stat">
            <div className="stat-label">Total Accounts</div>
            <div className="stat-value">{totalLiabilities}</div>
          </div>
          {summary?.accountsOverdue && summary.accountsOverdue > 0 ? (
            <div className="summary-stat warning">
              <div className="stat-label">⚠️ Overdue</div>
              <div className="stat-value">{summary.accountsOverdue}</div>
            </div>
          ) : (
            <div className="summary-stat success">
              <div className="stat-label">✓ On Track</div>
              <div className="stat-value">All Current</div>
            </div>
          )}
        </div>
        {summary?.nextPaymentDue && (
          <div className="next-payment">
            Next payment due: <strong>{formatDate(summary.nextPaymentDue)}</strong>
            {(() => {
              const days = getDaysUntil(summary.nextPaymentDue);
              if (days !== null) {
                return days < 0
                  ? ` (${Math.abs(days)} days overdue)`
                  : days === 0
                  ? ' (due today)'
                  : ` (in ${days} days)`;
              }
              return '';
            })()}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        {credit.length > 0 && (
          <button
            className={`tab ${activeTab === 'credit' ? 'active' : ''}`}
            onClick={() => setActiveTab('credit')}
          >
            Credit Cards ({credit.length})
          </button>
        )}
        {student.length > 0 && (
          <button
            className={`tab ${activeTab === 'student' ? 'active' : ''}`}
            onClick={() => setActiveTab('student')}
          >
            Student Loans ({student.length})
          </button>
        )}
        {mortgage.length > 0 && (
          <button
            className={`tab ${activeTab === 'mortgage' ? 'active' : ''}`}
            onClick={() => setActiveTab('mortgage')}
          >
            Mortgages ({mortgage.length})
          </button>
        )}
      </div>

      {/* Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-grid">
            {credit.map((card: CreditCard) => {
              const account = accountMap.get(card.account_id);
              if (!account) return null;

              const balance = Math.abs(account.balances.current || 0);
              const limit = account.balances.limit || 0;
              const utilization = limit > 0 ? (balance / limit) * 100 : 0;
              const daysUntilDue = getDaysUntil(card.next_payment_due_date);

              return (
                <div key={card.account_id} className="liability-card credit-card">
                  <div className="card-header">
                    <div className="card-icon">💳</div>
                    <div className="card-info">
                      <div className="card-name">{account.name}</div>
                      <div className="card-type">Credit Card {account.mask && `• ****${account.mask}`}</div>
                    </div>
                    {card.is_overdue && <div className="overdue-badge">OVERDUE</div>}
                  </div>
                  <div className="card-body">
                    <div className="balance-row">
                      <div className="balance-label">Balance</div>
                      <div className="balance-amount">{formatCurrency(balance)}</div>
                    </div>
                    {limit > 0 && (
                      <div className="utilization-bar">
                        <div className="utilization-fill" style={{ width: `${Math.min(utilization, 100)}%` }}></div>
                      </div>
                    )}
                    <div className="card-details">
                      <div className="detail-row">
                        <span>Credit Limit:</span>
                        <span>{formatCurrency(limit)}</span>
                      </div>
                      <div className="detail-row">
                        <span>Utilization:</span>
                        <span className={utilization > 80 ? 'warning' : ''}>{formatPercent(utilization)}</span>
                      </div>
                      <div className="detail-row">
                        <span>Min Payment:</span>
                        <span>{formatCurrency(card.minimum_payment_amount || 0)}</span>
                      </div>
                      <div className="detail-row">
                        <span>Due Date:</span>
                        <span className={daysUntilDue !== null && daysUntilDue < 7 ? 'warning' : ''}>
                          {formatDate(card.next_payment_due_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {student.map((loan: StudentLoan) => {
              const account = accountMap.get(loan.account_id);
              if (!account) return null;

              const balance = account.balances.current || 0;
              const daysUntilDue = getDaysUntil(loan.next_payment_due_date);

              return (
                <div key={loan.account_id} className="liability-card student-loan">
                  <div className="card-header">
                    <div className="card-icon">🎓</div>
                    <div className="card-info">
                      <div className="card-name">{loan.loan_name || account.name}</div>
                      <div className="card-type">Student Loan</div>
                    </div>
                    {loan.is_overdue && <div className="overdue-badge">OVERDUE</div>}
                  </div>
                  <div className="card-body">
                    <div className="balance-row">
                      <div className="balance-label">Remaining Balance</div>
                      <div className="balance-amount">{formatCurrency(balance)}</div>
                    </div>
                    <div className="card-details">
                      <div className="detail-row">
                        <span>Interest Rate:</span>
                        <span>{formatPercent(loan.interest_rate_percentage)}</span>
                      </div>
                      <div className="detail-row">
                        <span>Min Payment:</span>
                        <span>{formatCurrency(loan.minimum_payment_amount || 0)}</span>
                      </div>
                      <div className="detail-row">
                        <span>Due Date:</span>
                        <span className={daysUntilDue !== null && daysUntilDue < 7 ? 'warning' : ''}>
                          {formatDate(loan.next_payment_due_date)}
                        </span>
                      </div>
                      {loan.loan_status?.type && (
                        <div className="detail-row">
                          <span>Status:</span>
                          <span className="capitalize">{loan.loan_status.type.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {mortgage.map((mtg: Mortgage) => {
              const account = accountMap.get(mtg.account_id);
              if (!account) return null;

              const balance = account.balances.current || 0;
              const daysUntilDue = getDaysUntil(mtg.next_payment_due_date);

              return (
                <div key={mtg.account_id} className="liability-card mortgage">
                  <div className="card-header">
                    <div className="card-icon">🏠</div>
                    <div className="card-info">
                      <div className="card-name">{account.name}</div>
                      <div className="card-type">Mortgage</div>
                    </div>
                    {mtg.past_due_amount && mtg.past_due_amount > 0 && (
                      <div className="overdue-badge">PAST DUE</div>
                    )}
                  </div>
                  <div className="card-body">
                    <div className="balance-row">
                      <div className="balance-label">Principal Balance</div>
                      <div className="balance-amount">{formatCurrency(balance)}</div>
                    </div>
                    <div className="card-details">
                      <div className="detail-row">
                        <span>Interest Rate:</span>
                        <span>
                          {formatPercent(mtg.interest_rate.percentage || 0)}
                          {mtg.interest_rate.type && ` (${mtg.interest_rate.type})`}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span>Monthly Payment:</span>
                        <span>{formatCurrency(mtg.next_monthly_payment || 0)}</span>
                      </div>
                      <div className="detail-row">
                        <span>Due Date:</span>
                        <span className={daysUntilDue !== null && daysUntilDue < 7 ? 'warning' : ''}>
                          {formatDate(mtg.next_payment_due_date)}
                        </span>
                      </div>
                      {mtg.loan_term && (
                        <div className="detail-row">
                          <span>Term:</span>
                          <span>{mtg.loan_term}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'credit' && credit.length > 0 && (
          <div className="detail-view">
            {credit.map((card: CreditCard) => {
              const account = accountMap.get(card.account_id);
              if (!account) return null;

              const balance = Math.abs(account.balances.current || 0);
              const limit = account.balances.limit || 0;
              const utilization = limit > 0 ? (balance / limit) * 100 : 0;

              return (
                <div key={card.account_id} className="detail-card">
                  <div className="detail-header">
                    <div>
                      <h3>{account.name}</h3>
                      <p className="detail-subtitle">{account.official_name || `Credit Card ${account.mask ? `• ****${account.mask}` : ''}`}</p>
                    </div>
                    {card.is_overdue && <div className="overdue-badge large">OVERDUE</div>}
                  </div>

                  <div className="detail-section">
                    <h4>Balance & Utilization</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <div className="item-label">Current Balance</div>
                        <div className="item-value large">{formatCurrency(balance)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Credit Limit</div>
                        <div className="item-value">{formatCurrency(limit)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Available Credit</div>
                        <div className="item-value">{formatCurrency(Math.max(0, limit - balance))}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Utilization</div>
                        <div className={`item-value ${utilization > 80 ? 'warning' : ''}`}>
                          {formatPercent(utilization)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Payment Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <div className="item-label">Minimum Payment</div>
                        <div className="item-value large">{formatCurrency(card.minimum_payment_amount || 0)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Due Date</div>
                        <div className="item-value">{formatDate(card.next_payment_due_date)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Last Payment</div>
                        <div className="item-value">{formatCurrency(card.last_payment_amount || 0)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Last Payment Date</div>
                        <div className="item-value">{formatDate(card.last_payment_date)}</div>
                      </div>
                    </div>
                  </div>

                  {card.aprs && card.aprs.length > 0 && (
                    <div className="detail-section">
                      <h4>APR Breakdown</h4>
                      <div className="apr-list">
                        {card.aprs.map((apr, idx) => (
                          <div key={idx} className="apr-item">
                            <div className="apr-type capitalize">{apr.apr_type.replace(/_/g, ' ')}</div>
                            <div className="apr-details">
                              <div className="apr-rate">{formatPercent(apr.apr_percentage)}</div>
                              {apr.balance_subject_to_apr !== null && (
                                <div className="apr-balance">on {formatCurrency(apr.balance_subject_to_apr)}</div>
                              )}
                              {apr.interest_charge_amount !== null && apr.interest_charge_amount > 0 && (
                                <div className="apr-charge">Interest: {formatCurrency(apr.interest_charge_amount)}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {card.last_statement_balance !== null && (
                    <div className="detail-section">
                      <h4>Statement Information</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <div className="item-label">Last Statement Balance</div>
                          <div className="item-value">{formatCurrency(card.last_statement_balance)}</div>
                        </div>
                        <div className="detail-item">
                          <div className="item-label">Statement Date</div>
                          <div className="item-value">{formatDate(card.last_statement_issue_date)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'student' && student.length > 0 && (
          <div className="detail-view">
            {student.map((loan: StudentLoan) => {
              const account = accountMap.get(loan.account_id);
              if (!account) return null;

              const balance = account.balances.current || 0;
              const originalAmount = loan.origination_principal_amount || 0;
              const paidOff = originalAmount > 0 ? ((originalAmount - balance) / originalAmount) * 100 : 0;

              return (
                <div key={loan.account_id} className="detail-card">
                  <div className="detail-header">
                    <div>
                      <h3>{loan.loan_name || account.name}</h3>
                      <p className="detail-subtitle">
                        Student Loan {loan.account_number && `• ${loan.account_number}`}
                      </p>
                    </div>
                    {loan.is_overdue && <div className="overdue-badge large">OVERDUE</div>}
                  </div>

                  <div className="detail-section">
                    <h4>Loan Balance</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <div className="item-label">Current Balance</div>
                        <div className="item-value large">{formatCurrency(balance)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Original Principal</div>
                        <div className="item-value">{formatCurrency(originalAmount)}</div>
                      </div>
                      {loan.outstanding_interest_amount !== null && (
                        <div className="detail-item">
                          <div className="item-label">Outstanding Interest</div>
                          <div className="item-value">{formatCurrency(loan.outstanding_interest_amount)}</div>
                        </div>
                      )}
                      {originalAmount > 0 && (
                        <div className="detail-item">
                          <div className="item-label">Paid Off</div>
                          <div className="item-value">{formatPercent(paidOff)}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Payment Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <div className="item-label">Interest Rate</div>
                        <div className="item-value large">{formatPercent(loan.interest_rate_percentage)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Minimum Payment</div>
                        <div className="item-value">{formatCurrency(loan.minimum_payment_amount || 0)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Next Due Date</div>
                        <div className="item-value">{formatDate(loan.next_payment_due_date)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Expected Payoff</div>
                        <div className="item-value">{formatDate(loan.expected_payoff_date)}</div>
                      </div>
                    </div>
                  </div>

                  {loan.repayment_plan && (
                    <div className="detail-section">
                      <h4>Repayment Plan</h4>
                      <div className="detail-grid">
                        {loan.repayment_plan.description && (
                          <div className="detail-item">
                            <div className="item-label">Plan Type</div>
                            <div className="item-value">{loan.repayment_plan.description}</div>
                          </div>
                        )}
                        {loan.loan_status?.type && (
                          <div className="detail-item">
                            <div className="item-label">Loan Status</div>
                            <div className="item-value capitalize">{loan.loan_status.type.replace(/_/g, ' ')}</div>
                          </div>
                        )}
                        {loan.guarantor && (
                          <div className="detail-item">
                            <div className="item-label">Guarantor</div>
                            <div className="item-value">{loan.guarantor}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {loan.pslf_status && (
                    <div className="detail-section">
                      <h4>PSLF Status</h4>
                      <div className="detail-grid">
                        {loan.pslf_status.payments_made !== null && (
                          <div className="detail-item">
                            <div className="item-label">Payments Made</div>
                            <div className="item-value">{loan.pslf_status.payments_made}</div>
                          </div>
                        )}
                        {loan.pslf_status.payments_remaining !== null && (
                          <div className="detail-item">
                            <div className="item-label">Payments Remaining</div>
                            <div className="item-value">{loan.pslf_status.payments_remaining}</div>
                          </div>
                        )}
                        {loan.pslf_status.estimated_eligibility_date && (
                          <div className="detail-item">
                            <div className="item-label">Estimated Eligibility</div>
                            <div className="item-value">{formatDate(loan.pslf_status.estimated_eligibility_date)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(loan.ytd_interest_paid !== null || loan.ytd_principal_paid !== null) && (
                    <div className="detail-section">
                      <h4>Year-to-Date Payments</h4>
                      <div className="detail-grid">
                        {loan.ytd_principal_paid !== null && (
                          <div className="detail-item">
                            <div className="item-label">Principal Paid (YTD)</div>
                            <div className="item-value">{formatCurrency(loan.ytd_principal_paid)}</div>
                          </div>
                        )}
                        {loan.ytd_interest_paid !== null && (
                          <div className="detail-item">
                            <div className="item-label">Interest Paid (YTD)</div>
                            <div className="item-value">{formatCurrency(loan.ytd_interest_paid)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {loan.servicer_address && (
                    <div className="detail-section">
                      <h4>Servicer Information</h4>
                      <div className="servicer-address">
                        {loan.servicer_address.street && <div>{loan.servicer_address.street}</div>}
                        <div>
                          {[
                            loan.servicer_address.city,
                            loan.servicer_address.region,
                            loan.servicer_address.postal_code,
                          ].filter(Boolean).join(', ')}
                        </div>
                        {loan.payment_reference_number && (
                          <div className="reference-number">
                            Reference: {loan.payment_reference_number}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'mortgage' && mortgage.length > 0 && (
          <div className="detail-view">
            {mortgage.map((mtg: Mortgage) => {
              const account = accountMap.get(mtg.account_id);
              if (!account) return null;

              const balance = account.balances.current || 0;
              const originalAmount = mtg.origination_principal_amount || 0;
              const paidOff = originalAmount > 0 ? ((originalAmount - balance) / originalAmount) * 100 : 0;

              return (
                <div key={mtg.account_id} className="detail-card">
                  <div className="detail-header">
                    <div>
                      <h3>{account.name}</h3>
                      <p className="detail-subtitle">
                        {mtg.loan_type_description || 'Mortgage'} {mtg.account_number && `• ${mtg.account_number}`}
                      </p>
                    </div>
                    {mtg.past_due_amount && mtg.past_due_amount > 0 && (
                      <div className="overdue-badge large">PAST DUE: {formatCurrency(mtg.past_due_amount)}</div>
                    )}
                  </div>

                  {mtg.property_address && (
                    <div className="property-address">
                      <strong>Property:</strong>{' '}
                      {[
                        mtg.property_address.street,
                        mtg.property_address.city,
                        mtg.property_address.region,
                        mtg.property_address.postal_code,
                      ].filter(Boolean).join(', ')}
                    </div>
                  )}

                  <div className="detail-section">
                    <h4>Loan Balance</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <div className="item-label">Current Balance</div>
                        <div className="item-value large">{formatCurrency(balance)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Original Amount</div>
                        <div className="item-value">{formatCurrency(originalAmount)}</div>
                      </div>
                      {mtg.escrow_balance !== null && (
                        <div className="detail-item">
                          <div className="item-label">Escrow Balance</div>
                          <div className="item-value">{formatCurrency(mtg.escrow_balance)}</div>
                        </div>
                      )}
                      {originalAmount > 0 && (
                        <div className="detail-item">
                          <div className="item-label">Paid Off</div>
                          <div className="item-value">{formatPercent(paidOff)}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Loan Terms</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <div className="item-label">Interest Rate</div>
                        <div className="item-value large">
                          {formatPercent(mtg.interest_rate.percentage || 0)}
                          {mtg.interest_rate.type && ` (${mtg.interest_rate.type})`}
                        </div>
                      </div>
                      {mtg.loan_term && (
                        <div className="detail-item">
                          <div className="item-label">Loan Term</div>
                          <div className="item-value">{mtg.loan_term}</div>
                        </div>
                      )}
                      <div className="detail-item">
                        <div className="item-label">Origination Date</div>
                        <div className="item-value">{formatDate(mtg.origination_date)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Maturity Date</div>
                        <div className="item-value">{formatDate(mtg.maturity_date)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Payment Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <div className="item-label">Monthly Payment</div>
                        <div className="item-value large">{formatCurrency(mtg.next_monthly_payment || 0)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Next Due Date</div>
                        <div className="item-value">{formatDate(mtg.next_payment_due_date)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Last Payment</div>
                        <div className="item-value">{formatCurrency(mtg.last_payment_amount || 0)}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Last Payment Date</div>
                        <div className="item-value">{formatDate(mtg.last_payment_date)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Additional Information</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <div className="item-label">PMI</div>
                        <div className="item-value">{mtg.has_pmi ? 'Yes' : 'No'}</div>
                      </div>
                      <div className="detail-item">
                        <div className="item-label">Prepayment Penalty</div>
                        <div className="item-value">{mtg.has_prepayment_penalty ? 'Yes' : 'No'}</div>
                      </div>
                      {mtg.current_late_fee !== null && mtg.current_late_fee > 0 && (
                        <div className="detail-item">
                          <div className="item-label">Current Late Fee</div>
                          <div className="item-value warning">{formatCurrency(mtg.current_late_fee)}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {(mtg.ytd_interest_paid !== null || mtg.ytd_principal_paid !== null) && (
                    <div className="detail-section">
                      <h4>Year-to-Date Payments</h4>
                      <div className="detail-grid">
                        {mtg.ytd_principal_paid !== null && (
                          <div className="detail-item">
                            <div className="item-label">Principal Paid (YTD)</div>
                            <div className="item-value">{formatCurrency(mtg.ytd_principal_paid)}</div>
                          </div>
                        )}
                        {mtg.ytd_interest_paid !== null && (
                          <div className="detail-item">
                            <div className="item-label">Interest Paid (YTD)</div>
                            <div className="item-value">{formatCurrency(mtg.ytd_interest_paid)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .liabilities-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          padding: 16px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .summary-header {
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
          color: white;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .summary-main {
          margin-bottom: 16px;
        }

        .summary-label {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 4px;
        }

        .summary-amount {
          font-size: 36px;
          font-weight: 700;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 12px;
        }

        .summary-stat {
          background: rgba(255, 255, 255, 0.1);
          padding: 12px;
          border-radius: 8px;
        }

        .summary-stat.warning {
          background: rgba(251, 191, 36, 0.2);
        }

        .summary-stat.success {
          background: rgba(34, 197, 94, 0.2);
        }

        .stat-label {
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 600;
        }

        .next-payment {
          font-size: 13px;
          opacity: 0.9;
          margin-top: 12px;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
          overflow-x: auto;
        }

        .tab {
          padding: 12px 20px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .tab:hover {
          color: #111827;
        }

        .tab.active {
          color: #dc2626;
          border-bottom-color: #dc2626;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        .liability-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          transition: box-shadow 0.2s;
        }

        .liability-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .card-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 8px;
        }

        .card-info {
          flex: 1;
        }

        .card-name {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 2px;
        }

        .card-type {
          font-size: 12px;
          color: #6b7280;
        }

        .overdue-badge {
          background: #dc2626;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
        }

        .overdue-badge.large {
          font-size: 12px;
          padding: 6px 12px;
        }

        .card-body {
          padding: 16px;
        }

        .balance-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 12px;
        }

        .balance-label {
          font-size: 13px;
          color: #6b7280;
        }

        .balance-amount {
          font-size: 22px;
          font-weight: 700;
          color: #111827;
        }

        .utilization-bar {
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .utilization-fill {
          height: 100%;
          background: linear-gradient(90deg, #fbbf24, #dc2626);
          transition: width 0.3s;
        }

        .card-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .detail-row span:first-child {
          color: #6b7280;
        }

        .detail-row span:last-child {
          color: #111827;
          font-weight: 500;
        }

        .detail-row .warning {
          color: #dc2626;
          font-weight: 600;
        }

        .detail-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .detail-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }

        .detail-header {
          padding: 20px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .detail-header h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          color: #111827;
        }

        .detail-subtitle {
          margin: 0;
          font-size: 13px;
          color: #6b7280;
        }

        .property-address {
          padding: 12px 20px;
          background: #fef3c7;
          border-bottom: 1px solid #fde68a;
          font-size: 13px;
          color: #92400e;
        }

        .detail-section {
          padding: 20px;
          border-bottom: 1px solid #f3f4f6;
        }

        .detail-section:last-child {
          border-bottom: none;
        }

        .detail-section h4 {
          margin: 0 0 16px 0;
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .item-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }

        .item-value {
          font-size: 15px;
          color: #111827;
          font-weight: 600;
        }

        .item-value.large {
          font-size: 20px;
        }

        .item-value.warning {
          color: #dc2626;
        }

        .apr-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .apr-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .apr-type {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
        }

        .apr-details {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
        }

        .apr-rate {
          font-size: 15px;
          font-weight: 700;
          color: #dc2626;
        }

        .apr-balance,
        .apr-charge {
          color: #6b7280;
        }

        .servicer-address {
          font-size: 13px;
          color: #111827;
          line-height: 1.6;
        }

        .reference-number {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
          font-weight: 600;
          color: #6b7280;
        }

        .capitalize {
          text-transform: capitalize;
        }

        .no-data {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }

        .no-data-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .no-data-text {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 8px;
        }

        .no-data-subtext {
          font-size: 14px;
        }

        @media (max-width: 640px) {
          .overview-grid {
            grid-template-columns: 1fr;
          }

          .summary-amount {
            font-size: 28px;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
