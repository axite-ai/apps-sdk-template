import { db } from '@/lib/db';
import { plaidItems, plaidAccounts, plaidTransactions } from '@/lib/db/schema';
import { eq, sql, inArray, and, gte, lte } from 'drizzle-orm';
import { getPlaidClient } from '../config/plaid';
import { EncryptionService } from './encryption-service';
import {
  CountryCode,
  Products,
  AccountsGetRequest,
  TransactionsSyncRequest,
  RemovedTransaction,
  Transaction,
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
  const request: AccountsGetRequest = {
    access_token: accessToken,
  };
  try {
    const response = await getPlaidClient().accountsGet(request);
    return response.data;
  } catch (error: unknown) {
    const plaidError = error as { response?: { data?: { error_message?: string } } };
    console.error('Error getting account balances:', plaidError.response?.data);
    throw new Error(`Failed to get account balances: ${plaidError.response?.data?.error_message || 'Unknown error'}`);
  }
}

/**
 * Get transactions for a given access token
 * @param accessToken Plaid access token
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @returns Transactions and accounts
 */
/**
 * Fetches transaction updates from Plaid for a given item.
 * @param accessToken The access token for the item.
 * @param initialCursor The last stored cursor for the item.
 * @returns An object containing added, modified, and removed transactions, plus the next cursor.
 */
async function fetchTransactionUpdates(accessToken: string, initialCursor: string | null) {
  let cursor = initialCursor;
  const added: Transaction[] = [];
  const modified: Transaction[] = [];
  const removed: RemovedTransaction[] = [];
  let hasMore = true;

  try {
    while (hasMore) {
      const response = await getPlaidClient().transactionsSync({
        access_token: accessToken,
        cursor: cursor ?? undefined,
        count: 500, // Max count
      });

      const { data } = response;
      added.push(...data.added);
      modified.push(...data.modified);
      removed.push(...data.removed);
      hasMore = data.has_more;
      cursor = data.next_cursor;
    }
    return { added, modified, removed, nextCursor: cursor };
  } catch (error) {
    console.error(`Error fetching transactions for access token ${accessToken}:`, error);
    // Return what we have so far, but don't update the cursor
    return { added, modified, removed, nextCursor: initialCursor };
  }
}

/**
 * Get spending insights from transactions
 * @param accessToken Plaid access token
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @returns Spending analysis by category
 */
export async function syncTransactionsForItem(itemId: string, dbInstance: typeof db = db) {
  try {
    // 1. Get the item from the database
    const item = await dbInstance.query.plaidItems.findFirst({
      where: eq(plaidItems.itemId, itemId),
    });

    if (!item) {
      throw new Error(`Item with ID ${itemId} not found.`);
    }

    // Decrypt access token
    const accessToken = EncryptionService.decrypt(item.accessToken);

    // 2. Fetch all available accounts for the item
    const accountsResponse = await getPlaidClient().accountsGet({ access_token: accessToken });
    const accounts = accountsResponse.data.accounts;

    // 3. Upsert accounts into the database
    await dbInstance.insert(plaidAccounts)
      .values(accounts.map(acc => ({
        accountId: acc.account_id,
        itemId: item.itemId,
        userId: item.userId,
        name: acc.name,
        mask: acc.mask,
        officialName: acc.official_name,
        currentBalance: acc.balances.current?.toString(),
        availableBalance: acc.balances.available?.toString(),
        isoCurrencyCode: acc.balances.iso_currency_code,
        type: acc.type,
        subtype: acc.subtype,
        persistentAccountId: acc.persistent_account_id,
      })))
      .onConflictDoUpdate({
        target: plaidAccounts.accountId,
        set: {
          currentBalance: sql`excluded.current_balance`,
          availableBalance: sql`excluded.available_balance`,
          updatedAt: new Date(),
        }
      });

    // 4. Fetch transaction updates
    const { added, modified, removed, nextCursor } = await fetchTransactionUpdates(accessToken, item.transactionsCursor);

    // 5. Process updates
    if (removed.length > 0) {
      await dbInstance.delete(plaidTransactions).where(inArray(plaidTransactions.transactionId, removed.map(t => t.transaction_id)));
    }

    const transactionsToUpsert = [...added, ...modified];
    if (transactionsToUpsert.length > 0) {
      await dbInstance.insert(plaidTransactions)
        .values(transactionsToUpsert.map(t => ({
          transactionId: t.transaction_id,
          accountId: t.account_id,
          userId: item.userId,
          amount: t.amount.toString(),
          isoCurrencyCode: t.iso_currency_code,
          unofficialCurrencyCode: t.unofficial_currency_code,
          categoryPrimary: t.personal_finance_category?.primary,
          categoryDetailed: t.personal_finance_category?.detailed,
          categoryConfidence: t.personal_finance_category?.confidence_level,
          checkNumber: t.check_number,
          date: new Date(t.date),
          datetime: t.datetime ? new Date(t.datetime) : null,
          authorizedDate: t.authorized_date ? new Date(t.authorized_date) : null,
          authorizedDatetime: t.authorized_datetime ? new Date(t.authorized_datetime) : null,
          location: t.location,
          merchantName: t.merchant_name,
          paymentChannel: t.payment_channel,
          pending: t.pending,
          pendingTransactionId: t.pending_transaction_id,
          transactionCode: t.transaction_code,
          name: t.name,
          originalDescription: t.original_description,
          logoUrl: t.logo_url,
          website: t.website,
          counterparties: t.counterparties,
          paymentMeta: t.payment_meta,
          rawData: t,
        })))
        .onConflictDoUpdate({
          target: plaidTransactions.transactionId,
          set: {
            amount: sql`excluded.amount`,
            categoryPrimary: sql`excluded.category_primary`,
            categoryDetailed: sql`excluded.category_detailed`,
            pending: sql`excluded.pending`,
            merchantName: sql`excluded.merchant_name`,
            paymentChannel: sql`excluded.payment_channel`,
            updatedAt: new Date(),
            rawData: sql`excluded.raw_data`,
          }
        });
    }

    // 6. Update the cursor in the database
    await dbInstance.update(plaidItems)
      .set({ transactionsCursor: nextCursor, updatedAt: new Date() })
      .where(eq(plaidItems.itemId, itemId));

    return {
      added: added.length,
      modified: modified.length,
      removed: removed.length,
    };

  } catch (error) {
    console.error(`Failed to sync transactions for item ${itemId}:`, error);
    throw new Error(`Failed to sync transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getSpendingInsights(userId: string, startDate: string, endDate: string) {
  try {
    const userAccountIds = (await db.query.plaidAccounts.findMany({
      where: eq(plaidAccounts.userId, userId)
    })).map(acc => acc.accountId);

    if (userAccountIds.length === 0) {
      return {
        totalSpending: 0,
        categoryBreakdown: [],
        transactionCount: 0,
        dateRange: { startDate, endDate },
      };
    }

    const transactions = await db.query.plaidTransactions.findMany({
      where: and(
        inArray(plaidTransactions.accountId, userAccountIds),
        gte(plaidTransactions.date, new Date(startDate)),
        lte(plaidTransactions.date, new Date(endDate))
      )
    });

    // Group transactions by category and calculate totals
    const categoryTotals = new Map<string, number>();
    let totalSpending = 0;

    for (const tx of transactions) {
      const amount = parseFloat(tx.amount);
      if (amount > 0 && !tx.pending) { // Only count expenses (positive amounts)
        const category = tx.categoryPrimary || 'Uncategorized';
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
        totalSpending += amount;
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
      const balance = account.balances.current || 0;
      const available = account.balances.available || 0;

      // Check for low balance
      if (balance < 100 && account.type === 'depository') {
        warnings.push('Low balance warning');
      }

      // Check for negative balance
      if (balance < 0) {
        warnings.push('Negative balance');
      }

      // Check for over-limit on credit accounts
      if (account.type === 'credit' && account.balances.limit) {
        const utilization = (Math.abs(balance) / account.balances.limit) * 100;
        if (utilization > 90) {
          warnings.push('High credit utilization (>90%)');
        } else if (utilization > 70) {
          warnings.push('Moderate credit utilization (>70%)');
        }
      }

      return {
        accountId: account.account_id,
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
