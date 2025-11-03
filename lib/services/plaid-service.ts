import 'server-only'

import { getPlaidClient } from '../config/plaid';
import {
  CountryCode,
  Products,
  AccountsGetRequest,
  TransactionsGetRequest,
  TransactionsSyncRequest,
  TransactionsRecurringGetRequest,
  AuthGetRequest,
  InvestmentsHoldingsGetRequest,
  InvestmentsTransactionsGetRequest,
  LiabilitiesGetRequest,
  LinkTokenCreateRequest,
  ItemPublicTokenExchangeRequest,
  ItemGetRequest,
} from 'plaid';

/**
 * Create a Link token for initializing Plaid Link
 * @param userId Unique user identifier
 * @param redirectUri Optional redirect URI for OAuth flows
 * @returns Link token for client-side Plaid Link initialization
 */
export const createLinkToken = async (userId: string, redirectUri?: string) => {
  try {
    const request: LinkTokenCreateRequest = {
      user: {
        client_user_id: userId,
      },
      client_name: 'AskMyMoney',
      products: [Products.Transactions, Products.Auth, Products.Investments, Products.Liabilities],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: process.env.BETTER_AUTH_URL ? `${process.env.BETTER_AUTH_URL}/api/plaid/webhook` : undefined,
      ...(redirectUri && { redirect_uri: redirectUri }),
    };

    const response = await getPlaidClient().linkTokenCreate(request);
    return response.data;
  } catch (error) {
    console.error('Error creating link token:', error);
    throw new Error(`Failed to create link token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Exchange a public token for an access token
 * @param publicToken Public token from Plaid Link
 * @returns Access token and item ID
 */
export const exchangePublicToken = async (publicToken: string) => {
  try {
    const request: ItemPublicTokenExchangeRequest = {
      public_token: publicToken,
    };

    const response = await getPlaidClient().itemPublicTokenExchange(request);
    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  } catch (error) {
    console.error('Error exchanging public token:', error);
    throw new Error(`Failed to exchange public token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get account balances for a given access token
 * @param accessToken Plaid access token
 * @returns Account balances and details
 */
export async function getAccountBalances(accessToken: string) {
  try {
    const request: AccountsGetRequest = {
      access_token: accessToken,
    };

    const response = await getPlaidClient().accountsGet(request);
    return {
      accounts: response.data.accounts.map(account => ({
        id: account.account_id,
        name: account.name,
        officialName: account.official_name,
        type: account.type,
        subtype: account.subtype,
        mask: account.mask,
        balance: {
          current: account.balances.current,
          available: account.balances.available,
          limit: account.balances.limit,
          isoCurrencyCode: account.balances.iso_currency_code,
        },
      })),
      item: response.data.item,
    };
  } catch (error: any) {
    console.error('Error getting account balances:', error);

    // Handle Plaid-specific errors
    if (error?.response?.data?.error_code) {
      const plaidErrorCode = error.response.data.error_code;
      const plaidErrorMessage = error.response.data.error_message;

      // Item login required - user needs to reconnect
      if (plaidErrorCode === 'ITEM_LOGIN_REQUIRED') {
        throw new Error('Your bank connection has expired. Please reconnect your account.');
      }

      // Handle other common Plaid errors
      if (plaidErrorCode === 'INVALID_ACCESS_TOKEN') {
        throw new Error('Invalid bank connection. Please reconnect your account.');
      }

      throw new Error(`Plaid error (${plaidErrorCode}): ${plaidErrorMessage}`);
    }

    throw new Error(`Failed to get account balances: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get transactions for a given access token
 * @param accessToken Plaid access token
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @returns Transactions and accounts
 */
export async function getTransactions(accessToken: string, startDate: string, endDate: string) {
  try {
    const request: TransactionsGetRequest = {
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        count: 100, // Get up to 100 transactions
        offset: 0,
      },
    };

    const response = await getPlaidClient().transactionsGet(request);
    return {
      transactions: response.data.transactions.map(tx => ({
        id: tx.transaction_id,
        accountId: tx.account_id,
        amount: tx.amount,
        isoCurrencyCode: tx.iso_currency_code,
        date: tx.date,
        name: tx.name,
        merchantName: tx.merchant_name,
        category: tx.category,
        pending: tx.pending,
        paymentChannel: tx.payment_channel,
      })),
      accounts: response.data.accounts,
      totalTransactions: response.data.total_transactions,
    };
  } catch (error) {
    console.error('Error getting transactions:', error);
    throw new Error(`Failed to get transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get spending insights from transactions
 * @param accessToken Plaid access token
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @returns Spending analysis by category
 */
export async function getSpendingInsights(accessToken: string, startDate: string, endDate: string) {
  try {
    const { transactions } = await getTransactions(accessToken, startDate, endDate);

    // Group transactions by category and calculate totals
    const categoryTotals = new Map<string, number>();
    let totalSpending = 0;

    for (const tx of transactions) {
      if (tx.amount > 0 && !tx.pending) { // Only count expenses (positive amounts)
        const category = tx.category?.[0] || 'Uncategorized';
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + tx.amount);
        totalSpending += tx.amount;
      }
    }

    // Convert to array and sort by amount
    const insights = Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / totalSpending) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalSpending,
      categoryBreakdown: insights,
      transactionCount: transactions.length,
      dateRange: { startDate, endDate },
    };
  } catch (error) {
    console.error('Error getting spending insights:', error);
    throw new Error(`Failed to get spending insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check account health (balance trends, warnings)
 * @param accessToken Plaid access token
 * @returns Account health assessment
 */
export async function checkAccountHealth(accessToken: string) {
  try {
    const { accounts } = await getAccountBalances(accessToken);

    const healthChecks = accounts.map(account => {
      const warnings: string[] = [];
      const balance = account.balance.current || 0;
      const available = account.balance.available || 0;

      // Check for low balance
      if (balance < 100 && account.type === 'depository') {
        warnings.push('Low balance warning');
      }

      // Check for negative balance
      if (balance < 0) {
        warnings.push('Negative balance');
      }

      // Check for over-limit on credit accounts
      if (account.type === 'credit' && account.balance.limit) {
        const utilization = (Math.abs(balance) / account.balance.limit) * 100;
        if (utilization > 90) {
          warnings.push('High credit utilization (>90%)');
        } else if (utilization > 70) {
          warnings.push('Moderate credit utilization (>70%)');
        }
      }

      return {
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        balance,
        available,
        status: warnings.length === 0 ? 'healthy' : 'attention_needed',
        warnings,
      };
    });

    return {
      accounts: healthChecks,
      overallStatus: healthChecks.some(a => a.warnings.length > 0) ? 'attention_needed' : 'healthy',
      summary: {
        totalAccounts: accounts.length,
        accountsWithWarnings: healthChecks.filter(a => a.warnings.length > 0).length,
      },
    };
  } catch (error) {
    console.error('Error checking account health:', error);
    throw new Error(`Failed to check account health: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sync transactions (recommended over getTransactions)
 * @param accessToken Plaid access token
 * @param cursor Optional cursor for pagination
 * @returns Transaction updates with cursor for next call
 */
export async function syncTransactions(accessToken: string, cursor?: string) {
  try {
    const request: TransactionsSyncRequest = {
      access_token: accessToken,
      ...(cursor && { cursor }),
    };

    const response = await getPlaidClient().transactionsSync(request);
    return {
      added: response.data.added,
      modified: response.data.modified,
      removed: response.data.removed,
      nextCursor: response.data.next_cursor,
      hasMore: response.data.has_more,
    };
  } catch (error) {
    console.error('Error syncing transactions:', error);
    throw new Error(`Failed to sync transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get recurring transactions (subscriptions, bills)
 * @param accessToken Plaid access token
 * @returns Recurring transaction streams
 */
export async function getRecurringTransactions(accessToken: string) {
  try {
    const request: TransactionsRecurringGetRequest = {
      access_token: accessToken,
    };

    const response = await getPlaidClient().transactionsRecurringGet(request);
    return {
      inflowStreams: response.data.inflow_streams,
      outflowStreams: response.data.outflow_streams,
    };
  } catch (error) {
    console.error('Error getting recurring transactions:', error);
    throw new Error(`Failed to get recurring transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get account and routing numbers
 * @param accessToken Plaid access token
 * @returns Account numbers for ACH transfers
 */
export async function getAuth(accessToken: string) {
  try {
    const request: AuthGetRequest = {
      access_token: accessToken,
    };

    const response = await getPlaidClient().authGet(request);
    return {
      accounts: response.data.accounts,
      numbers: response.data.numbers,
    };
  } catch (error) {
    console.error('Error getting auth data:', error);
    throw new Error(`Failed to get auth data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get investment holdings
 * @param accessToken Plaid access token
 * @returns Investment holdings and securities
 */
export async function getInvestmentHoldings(accessToken: string) {
  try {
    const request: InvestmentsHoldingsGetRequest = {
      access_token: accessToken,
    };

    const response = await getPlaidClient().investmentsHoldingsGet(request);
    return {
      accounts: response.data.accounts,
      holdings: response.data.holdings,
      securities: response.data.securities,
    };
  } catch (error) {
    console.error('Error getting investment holdings:', error);
    throw new Error(`Failed to get investment holdings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get investment transactions
 * @param accessToken Plaid access token
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @returns Investment transactions (buys, sells, dividends)
 */
export async function getInvestmentTransactions(accessToken: string, startDate: string, endDate: string) {
  try {
    const request: InvestmentsTransactionsGetRequest = {
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    };

    const response = await getPlaidClient().investmentsTransactionsGet(request);
    return {
      accounts: response.data.accounts,
      investmentTransactions: response.data.investment_transactions,
      securities: response.data.securities,
      totalInvestmentTransactions: response.data.total_investment_transactions,
    };
  } catch (error) {
    console.error('Error getting investment transactions:', error);
    throw new Error(`Failed to get investment transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get liabilities (credit cards, loans, mortgages)
 * @param accessToken Plaid access token
 * @returns Liability details including payment schedules
 */
export async function getLiabilities(accessToken: string) {
  try {
    const request: LiabilitiesGetRequest = {
      access_token: accessToken,
    };

    const response = await getPlaidClient().liabilitiesGet(request);
    return {
      accounts: response.data.accounts,
      liabilities: response.data.liabilities,
    };
  } catch (error) {
    console.error('Error getting liabilities:', error);
    throw new Error(`Failed to get liabilities: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get information about an item
 * @param accessToken Plaid access token
 * @returns Item information
 */
export async function getItem(accessToken: string) {
  try {
    const request: ItemGetRequest = {
      access_token: accessToken,
    };

    const response = await getPlaidClient().itemGet(request);
    return response.data.item;
  } catch (error) {
    console.error('Error getting item:', error);
    throw new Error(`Failed to get item: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
