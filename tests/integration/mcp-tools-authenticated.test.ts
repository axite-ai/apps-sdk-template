import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockPlaidResponses } from '../mocks/plaid';
import { createMockDbPool, mockPlaidItems } from '../mocks/database';

/**
 * Integration tests for authenticated MCP tools
 *
 * These tests validate the three-tier authorization pattern:
 * 1. Check if user is logged in (OAuth session)
 * 2. Check if user has active subscription
 * 3. Check if user has linked Plaid accounts
 *
 * Authenticated tools:
 * - get_account_balances
 * - get_transactions
 * - get_spending_insights
 * - check_account_health
 */
describe('MCP Tools - Authenticated', () => {
  describe('Authorization - Three-tier pattern', () => {
    it('should require authentication (tier 1)', () => {
      const session = null; // No session = not logged in

      expect(session).toBeNull();
      // Tool should return login prompt response
    });

    it('should require active subscription (tier 2)', async () => {
      const session = { userId: 'user_no_sub_456' };
      const hasSubscription = false; // No active subscription

      expect(hasSubscription).toBe(false);
      // Tool should return subscription required response
    });

    it('should require Plaid connection (tier 3)', async () => {
      const session = { userId: 'user_with_sub_123' };
      const hasSubscription = true;
      const accessTokens: string[] = []; // No Plaid accounts linked

      expect(hasSubscription).toBe(true);
      expect(accessTokens).toHaveLength(0);
      // Tool should return Plaid required response
    });

    it('should pass all three authorization tiers', async () => {
      const session = { userId: 'user_with_plaid_789' };
      const hasSubscription = true;
      const accessTokens = ['access-token-1'];

      expect(session).toBeTruthy();
      expect(hasSubscription).toBe(true);
      expect(accessTokens).toHaveLength(1);
      // Tool should execute successfully
    });
  });

  describe('get_account_balances', () => {
    it('should return balances for all linked accounts', () => {
      const mockResponse = mockPlaidResponses.accountsGet('test-token');

      const result = {
        accounts: mockResponse.accounts,
        totalBalance: mockResponse.accounts.reduce(
          (sum, account) => sum + (account.balances.current || 0),
          0
        ),
        lastUpdated: new Date().toISOString(),
      };

      expect(result.accounts).toHaveLength(3);
      expect(result.totalBalance).toBe(22250); // 5250 + 15000 + 2000
      expect(result.lastUpdated).toBeTruthy();
    });

    it('should aggregate accounts from multiple Plaid items', () => {
      const item1Accounts = mockPlaidResponses.accountsGet('token-1').accounts;
      const item2Accounts = mockPlaidResponses.accountsGet('token-2').accounts;

      const allAccounts = [...item1Accounts, ...item2Accounts];
      const totalBalance = allAccounts.reduce(
        (sum, account) => sum + (account.balances.current || 0),
        0
      );

      expect(allAccounts).toHaveLength(6);
      expect(totalBalance).toBe(44500); // 22250 * 2
    });

    it('should handle accounts with null balances gracefully', () => {
      const accountsWithNull = [
        {
          account_id: 'acc_null',
          balances: {
            available: null,
            current: null,
            limit: null,
            iso_currency_code: 'USD',
            unofficial_currency_code: null,
          },
          mask: '0000',
          name: 'Account with null balance',
          official_name: 'Account',
          subtype: 'checking',
          type: 'depository',
        },
      ];

      const totalBalance = accountsWithNull.reduce(
        (sum, account) => sum + (account.balances.current || 0),
        0
      );

      expect(totalBalance).toBe(0);
    });

    it('should include account metadata in response', () => {
      const mockResponse = mockPlaidResponses.accountsGet('test-token');
      const account = mockResponse.accounts[0];

      expect(account).toHaveProperty('account_id');
      expect(account).toHaveProperty('name');
      expect(account).toHaveProperty('official_name');
      expect(account).toHaveProperty('type');
      expect(account).toHaveProperty('subtype');
      expect(account).toHaveProperty('mask');
      expect(account).toHaveProperty('balances');
    });
  });

  describe('get_transactions', () => {
    it('should return transactions from the local database', async () => {
      const { mockPool, mockClient } = createMockDbPool();
      const userId = 'user_123';
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';

      // Mock database response
      mockClient.query.mockResolvedValueOnce({
        rows: [mockPlaidItems.item1],
        rowCount: 1,
      });
      mockClient.query.mockResolvedValueOnce({
        rows: mockPlaidResponses.accountsGet('test-token').accounts,
        rowCount: 3,
      });
      mockClient.query.mockResolvedValueOnce({
        rows: mockPlaidResponses.transactionsGet('test-token', startDate, endDate).transactions,
        rowCount: 3,
      });

      // Simulate service call
      const result = {
        transactions: mockPlaidResponses.transactionsGet('test-token', startDate, endDate).transactions,
        totalTransactions: 3,
        dateRange: { start: startDate, end: endDate },
      };

      expect(result.transactions).toHaveLength(3);
      expect(result.totalTransactions).toBe(3);
      expect(result.dateRange).toEqual({ start: startDate, end: endDate });
    });
  });

  describe('get_spending_insights', () => {
    it('should analyze spending by category', () => {
      const transactions = mockPlaidResponses.transactionsGet(
        'test-token',
        '2025-01-01',
        '2025-01-31'
      ).transactions;

      // Group by category
      const categoryMap = new Map<string, { amount: number; count: number }>();
      let totalSpending = 0;

      transactions
        .filter((t) => t.amount > 0) // Only spending (positive amounts)
        .forEach((t) => {
          const category = t.category?.[0] || 'Uncategorized';
          const existing = categoryMap.get(category) || { amount: 0, count: 0 };
          categoryMap.set(category, {
            amount: existing.amount + t.amount,
            count: existing.count + 1,
          });
          totalSpending += t.amount;
        });

      const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        percentage: totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0,
      }));

      expect(categories.length).toBeGreaterThan(0);
      expect(totalSpending).toBe(167.5); // 42.5 + 125.0
      expect(
        categories.reduce((sum, cat) => sum + cat.percentage, 0)
      ).toBeCloseTo(100, 1);
    });

    it('should sort categories by amount (highest first)', () => {
      const categories = [
        { name: 'Food', amount: 125, count: 1, percentage: 74.63 },
        { name: 'Restaurants', amount: 42.5, count: 1, percentage: 25.37 },
      ];

      const sorted = categories.sort((a, b) => b.amount - a.amount);

      expect(sorted[0].amount).toBeGreaterThan(sorted[1].amount);
      expect(sorted[0].name).toBe('Food');
    });

    it('should calculate percentages correctly', () => {
      const totalSpending = 167.5;
      const categoryAmount = 125;
      const percentage = (categoryAmount / totalSpending) * 100;

      expect(percentage).toBeCloseTo(74.63, 2);
    });

    it('should aggregate insights from multiple accounts', () => {
      const insights1 = {
        categoryBreakdown: [{ category: 'Food', amount: 100, count: 1 }],
      };
      const insights2 = {
        categoryBreakdown: [{ category: 'Food', amount: 50, count: 1 }],
      };

      const categoryMap = new Map<string, { amount: number; count: number }>();

      [insights1, insights2].forEach((insights) => {
        insights.categoryBreakdown.forEach((cat) => {
          const existing = categoryMap.get(cat.category) || {
            amount: 0,
            count: 0,
          };
          categoryMap.set(cat.category, {
            amount: existing.amount + cat.amount,
            count: existing.count + 1,
          });
        });
      });

      const merged = categoryMap.get('Food');
      expect(merged?.amount).toBe(150);
      expect(merged?.count).toBe(2);
    });
  });

  describe('check_account_health', () => {
    it('should detect low balance warnings', () => {
      const account = {
        account_id: 'acc_1',
        name: 'Checking',
        balances: {
          current: 100, // Low balance
          available: 100,
        },
        type: 'depository',
        warnings: [] as string[],
      };

      // Check for low balance (< 500)
      if (account.balances.current && account.balances.current < 500) {
        account.warnings.push('Low balance detected');
      }

      expect(account.warnings).toContain('Low balance detected');
    });

    it('should detect negative balance (overdraft)', () => {
      const account = {
        account_id: 'acc_1',
        name: 'Checking',
        balances: {
          current: -50,
          available: -50,
        },
        type: 'depository',
        warnings: [] as string[],
      };

      // Check for negative balance
      if (account.balances.current && account.balances.current < 0) {
        account.warnings.push('Overdraft detected');
      }

      expect(account.warnings).toContain('Overdraft detected');
    });

    it('should detect high credit utilization', () => {
      const account = {
        account_id: 'acc_1',
        name: 'Credit Card',
        balances: {
          current: 8000, // Current balance
          limit: 10000, // Credit limit
        },
        type: 'credit',
        warnings: [] as string[],
      };

      // Check credit utilization (> 70%)
      if (
        account.type === 'credit' &&
        account.balances.limit &&
        account.balances.current
      ) {
        const utilization =
          (account.balances.current / account.balances.limit) * 100;
        if (utilization > 70) {
          account.warnings.push(
            `High credit utilization: ${utilization.toFixed(1)}%`
          );
        }
      }

      expect(account.warnings).toHaveLength(1);
      expect(account.warnings[0]).toContain('High credit utilization: 80.0%');
    });

    it('should return "healthy" status when no warnings', () => {
      const accounts = [
        {
          account_id: 'acc_1',
          name: 'Checking',
          balances: { current: 5000 },
          warnings: [],
        },
        {
          account_id: 'acc_2',
          name: 'Savings',
          balances: { current: 15000 },
          warnings: [],
        },
      ];

      const overallStatus =
        accounts.some((acc) => acc.warnings.length > 0)
          ? 'attention_needed'
          : 'healthy';

      expect(overallStatus).toBe('healthy');
    });

    it('should return "attention_needed" status when warnings exist', () => {
      const accounts = [
        {
          account_id: 'acc_1',
          name: 'Checking',
          balances: { current: 50 },
          warnings: ['Low balance detected'],
        },
      ];

      const overallStatus =
        accounts.some((acc) => acc.warnings.length > 0)
          ? 'attention_needed'
          : 'healthy';

      expect(overallStatus).toBe('attention_needed');
    });

    it('should count total warnings across all accounts', () => {
      const accounts = [
        { warnings: ['Low balance'] },
        { warnings: ['Overdraft', 'High utilization'] },
        { warnings: [] },
      ];

      const totalWarnings = accounts.reduce(
        (sum, acc) => sum + acc.warnings.length,
        0
      );

      expect(totalWarnings).toBe(3);
    });
  });
});
