/**
 * Type definitions for AskMyMoney tool-specific structured content
 */

import type { AccountBase, Transaction } from "plaid";
import type { MCPToolResponse, OpenAIResponseMetadata } from "./mcp-responses";

/**
 * Structured content for account balances
 */
export interface AccountBalancesContent {
  accounts: AccountBase[];
  totalBalance: number;
  lastUpdated: string;
}

/**
 * Structured content for transactions
 */
export interface TransactionsContent {
  transactions: Transaction[];
  totalTransactions: number;
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * Structured content for spending insights
 */
export interface SpendingInsightsContent {
  categories: Array<{
    name: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  totalSpending: number;
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * Structured content for account health check
 */
export interface AccountHealthContent {
  accounts: Array<{
    accountId: string;
    accountName: string;
    accountType: string;
    balance: number;
    available: number;
    status: "healthy" | "warning" | "critical";
    warnings: string[];
  }>;
  overallStatus: "healthy" | "attention_needed";
  summary: {
    totalAccounts: number;
    accountsWithWarnings: number;
    totalBalance: number;
  };
}

/**
 * Structured content for subscription/Plaid required errors
 */
export interface RequiredFeatureContent {
  featureName: string;
  error_message: string;
  pricingUrl: string;
  userId: string | undefined;
}

/**
 * Structured content for financial tips
 */
export interface FinancialTipsContent {
  topic: string;
  tips: Array<{
    title: string;
    description: string;
    category: string;
  }>;
  resources: string[];
}

/**
 * Structured content for budget calculation
 */
export interface BudgetCalculationContent {
  monthlyIncome: number;
  needs: {
    amount: number;
    percentage: number;
  };
  wants: {
    amount: number;
    percentage: number;
  };
  savings: {
    amount: number;
    percentage: number;
  };
  debtPayment?: {
    amount: number;
    percentage: number;
  };
  recommendations: string[];
}

/**
 * Simple message content for acknowledgments
 */
export interface MessageContent {
  message: string;
}

/**
 * Structured content for subscription management
 */
export interface SubscriptionManagementContent {
  billingPortalUrl: string;
  currentPlan?: string;
  message: string;
}

/**
 * Structured content for investment holdings
 */
export interface InvestmentHoldingsContent {
  accounts: Array<{
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
  }>;
  holdings: Array<{
    account_id: string;
    security_id: string;
    cost_basis: number | null;
    institution_price: number;
    institution_price_as_of: string | null;
    institution_value: number;
    iso_currency_code: string;
    quantity: number;
    unofficial_currency_code: string | null;
  }>;
  securities: Array<{
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
  }>;
  totalValue: number;
  lastUpdated: string;
}

/**
 * Structured content for liabilities (credit cards, loans, mortgages)
 */
export interface LiabilitiesContent {
  accounts: Array<{
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
  }>;
  credit: Array<{
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
  }>;
  student: Array<{
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
    sequence_number: string | null;
    servicer_address: {
      city: string | null;
      country: string | null;
      postal_code: string | null;
      region: string | null;
      street: string | null;
    };
    ytd_interest_paid: number | null;
    ytd_principal_paid: number | null;
  }>;
  mortgage: Array<{
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
  }>;
  summary: {
    totalDebt: number;
    totalMinimumPayment: number;
    accountsOverdue: number;
    nextPaymentDue: string | null;
  };
  lastUpdated: string;
}

/**
 * Type-safe response helpers for each tool
 */
export type AccountBalancesResponse = MCPToolResponse<
  AccountBalancesContent,
  OpenAIResponseMetadata
>;

export type TransactionsResponse = MCPToolResponse<
  TransactionsContent,
  OpenAIResponseMetadata
>;

export type SpendingInsightsResponse = MCPToolResponse<
  SpendingInsightsContent,
  OpenAIResponseMetadata
>;

export type AccountHealthResponse = MCPToolResponse<
  AccountHealthContent,
  OpenAIResponseMetadata
>;

export type RequiredFeatureResponse = MCPToolResponse<
  RequiredFeatureContent,
  OpenAIResponseMetadata
>;

export type FinancialTipsResponse = MCPToolResponse<
  FinancialTipsContent,
  OpenAIResponseMetadata
>;

export type BudgetCalculationResponse = MCPToolResponse<
  BudgetCalculationContent,
  OpenAIResponseMetadata
>;

export type MessageResponse = MCPToolResponse<
  MessageContent,
  OpenAIResponseMetadata
>;

export type SubscriptionManagementResponse = MCPToolResponse<
  SubscriptionManagementContent,
  OpenAIResponseMetadata
>;

export type InvestmentHoldingsResponse = MCPToolResponse<
  InvestmentHoldingsContent,
  OpenAIResponseMetadata
>;

export type LiabilitiesResponse = MCPToolResponse<
  LiabilitiesContent,
  OpenAIResponseMetadata
>;
