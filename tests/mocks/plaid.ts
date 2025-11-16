import { vi } from 'vitest';
import type {
  AccountsGetResponse,
  TransactionsGetResponse,
  ItemPublicTokenExchangeResponse,
  LinkTokenCreateResponse,
  TransactionsSyncResponse,
  AccountSubtype,
  AccountType,
  Products,
  ItemUpdateTypeEnum,
  TransactionPaymentChannelEnum,
  TransactionTransactionTypeEnum,
} from 'plaid';
import {   TransactionsUpdateStatus } from 'plaid'

/**
 * Mock Plaid API responses
 */
export const mockPlaidResponses = {
  accountsGet: (accessToken: string): AccountsGetResponse => ({
    accounts: [
      {
        account_id: 'acc_1',
        balances: {
          available: 5000,
          current: 5250,
          limit: null,
          iso_currency_code: 'USD',
          unofficial_currency_code: null,
        },
        mask: '0000',
        name: 'Checking Account',
        official_name: 'Premium Checking',
        subtype: 'checking' as AccountSubtype,
        type: 'depository' as AccountType,
      },
      {
        account_id: 'acc_2',
        balances: {
          available: 15000,
          current: 15000,
          limit: null,
          iso_currency_code: 'USD',
          unofficial_currency_code: null,
        },
        mask: '1111',
        name: 'Savings Account',
        official_name: 'High Yield Savings',
        subtype: 'savings' as AccountSubtype,
        type: 'depository' as AccountType,
      },
      {
        account_id: 'acc_3',
        balances: {
          available: 8000,
          current: 2000,
          limit: 10000,
          iso_currency_code: 'USD',
          unofficial_currency_code: null,
        },
        mask: '2222',
        name: 'Credit Card',
        official_name: 'Platinum Rewards Card',
        subtype: 'credit card' as AccountSubtype,
        type: 'credit' as AccountType,
      },
    ],
    item: {
      available_products: ['balance', 'transactions'] as Products[],
      billed_products: ['assets'] as Products[],
      consent_expiration_time: null,
      error: null,
      institution_id: 'ins_1',
      item_id: 'item_1',
      update_type: 'background' as ItemUpdateTypeEnum,
      webhook: '',
    },
    request_id: 'req_1',
  }),

  transactionsGet: (
    accessToken: string,
    startDate: string,
    endDate: string
  ): TransactionsGetResponse => ({
    accounts: [
      {
        account_id: 'acc_1',
        balances: {
          available: 5000,
          current: 5250,
          limit: null,
          iso_currency_code: 'USD',
          unofficial_currency_code: null,
        },
        mask: '0000',
        name: 'Checking Account',
        official_name: 'Premium Checking',
        subtype: 'checking' as AccountSubtype,
        type: 'depository' as AccountType,
      },
    ],
    transactions: [
      {
        account_id: 'acc_1',
        account_owner: null,
        amount: 42.5,
        iso_currency_code: 'USD',
        unofficial_currency_code: null,
        category: ['Food and Drink', 'Restaurants'],
        category_id: '13005000',
        check_number: null,
        date: '2025-01-05',
        datetime: null,
        authorized_date: null,
        authorized_datetime: null,
        location: {
          address: null,
          city: null,
          region: null,
          postal_code: null,
          country: null,
          lat: null,
          lon: null,
          store_number: null,
        },
        name: 'Restaurant Transaction',
        merchant_name: 'Tasty Cafe',
        payment_meta: {
          by_order_of: null,
          payee: null,
          payer: null,
          payment_method: null,
          payment_processor: null,
          ppd_id: null,
          reason: null,
          reference_number: null,
        },
        payment_channel: 'in store' as TransactionPaymentChannelEnum,
        pending: false,
        pending_transaction_id: null,
        personal_finance_category: {
          primary: 'FOOD_AND_DRINK',
          detailed: 'FOOD_AND_DRINK_RESTAURANTS',
          confidence_level: 'VERY_HIGH',
        },
        personal_finance_category_icon_url: 'https://plaid.com/category/food.png',
        transaction_id: 'txn_1',
        transaction_code: null,
        transaction_type: 'place' as TransactionTransactionTypeEnum,
      },
      {
        account_id: 'acc_1',
        account_owner: null,
        amount: 125.0,
        iso_currency_code: 'USD',
        unofficial_currency_code: null,
        category: ['Shops', 'Supermarkets and Groceries'],
        category_id: '19047000',
        check_number: null,
        date: '2025-01-04',
        datetime: null,
        authorized_date: null,
        authorized_datetime: null,
        location: {
          address: null,
          city: null,
          region: null,
          postal_code: null,
          country: null,
          lat: null,
          lon: null,
          store_number: null,
        },
        name: 'Grocery Store',
        merchant_name: 'Fresh Market',
        payment_meta: {
          by_order_of: null,
          payee: null,
          payer: null,
          payment_method: null,
          payment_processor: null,
          ppd_id: null,
          reason: null,
          reference_number: null,
        },
        payment_channel: 'in store' as TransactionPaymentChannelEnum,
        pending: false,
        pending_transaction_id: null,
        personal_finance_category: {
          primary: 'FOOD_AND_DRINK',
          detailed: 'FOOD_AND_DRINK_GROCERIES',
          confidence_level: 'VERY_HIGH',
        },
        personal_finance_category_icon_url: 'https://plaid.com/category/groceries.png',
        transaction_id: 'txn_2',
        transaction_code: null,
        transaction_type: 'place' as TransactionTransactionTypeEnum,
      },
      {
        account_id: 'acc_1',
        account_owner: null,
        amount: -2500.0,
        iso_currency_code: 'USD',
        unofficial_currency_code: null,
        category: ['Transfer', 'Payroll'],
        category_id: '21009000',
        check_number: null,
        date: '2025-01-01',
        datetime: null,
        authorized_date: null,
        authorized_datetime: null,
        location: {
          address: null,
          city: null,
          region: null,
          postal_code: null,
          country: null,
          lat: null,
          lon: null,
          store_number: null,
        },
        name: 'PAYROLL DEPOSIT',
        merchant_name: null,
        payment_meta: {
          by_order_of: null,
          payee: null,
          payer: null,
          payment_method: null,
          payment_processor: null,
          ppd_id: null,
          reason: null,
          reference_number: null,
        },
        payment_channel: 'other' as TransactionPaymentChannelEnum,
        pending: false,
        pending_transaction_id: null,
        personal_finance_category: {
          primary: 'INCOME',
          detailed: 'INCOME_WAGES',
          confidence_level: 'VERY_HIGH',
        },
        personal_finance_category_icon_url: 'https://plaid.com/category/income.png',
        transaction_id: 'txn_3',
        transaction_code: null,
        transaction_type: 'special' as TransactionTransactionTypeEnum,
      },
    ],
    total_transactions: 3,
    item: {
      available_products: ['balance', 'transactions'] as Products[],
      billed_products: ['assets'] as Products[],
      consent_expiration_time: null,
      error: null,
      institution_id: 'ins_1',
      item_id: 'item_1',
      update_type: 'background' as ItemUpdateTypeEnum,
      webhook: '',
    },
    request_id: 'req_2',
  }),

  transactionsSync: (accessToken: string, cursor: string | null): TransactionsSyncResponse => ({
    added: mockPlaidResponses.transactionsGet(accessToken, '', '').transactions,
    modified: [
      {
        ...mockPlaidResponses.transactionsGet(accessToken, '', '').transactions[0],
        transaction_id: 'txn_mod_1',
        amount: 50.0,
      }
    ],
    removed: [{ transaction_id: 'txn_rem_1', account_id: 'acc_1' }],
    next_cursor: 'next_cursor_123',
    has_more: false,
    request_id: 'req_sync_1',
    transactions_update_status: TransactionsUpdateStatus.HistoricalUpdateComplete,
    accounts: mockPlaidResponses.accountsGet(accessToken).accounts,
  }),

  linkTokenCreate: (): LinkTokenCreateResponse => ({
    link_token: 'link-sandbox-test-token',
    expiration: new Date(Date.now() + 3600000).toISOString(),
    request_id: 'req_3',
  }),

  itemPublicTokenExchange: (
    publicToken: string
  ): ItemPublicTokenExchangeResponse => ({
    access_token: 'access-sandbox-test-token',
    item_id: 'item_test_123',
    request_id: 'req_4',
  }),
};

/**
 * Create mock Plaid client
 */
export const createMockPlaidClient = () => ({
  accountsGet: vi.fn().mockResolvedValue(mockPlaidResponses.accountsGet('test-token')),
  transactionsGet: vi
    .fn()
    .mockResolvedValue(
      mockPlaidResponses.transactionsGet('test-token', '2025-01-01', '2025-01-31')
    ),
  linkTokenCreate: vi.fn().mockResolvedValue(mockPlaidResponses.linkTokenCreate()),
  itemPublicTokenExchange: vi
    .fn()
    .mockResolvedValue(mockPlaidResponses.itemPublicTokenExchange('public-token')),
});
