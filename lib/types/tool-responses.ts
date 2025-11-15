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
