export const MOCK_DATA = {
  "account-balances": {
    data: {
      structuredContent: {
        summary: {
          totalBalance: 6250.75,
          accountCount: 3,
          healthScore: 85,
          trend: "improving",
        },
        accounts: [
          {
            id: "acc_1",
            name: "Checking",
            type: "depository",
            subtype: "checking",
            balance: 1200.50,
            available: 1100.00,
            currencyCode: "USD",
          },
          {
            id: "acc_2",
            name: "Savings",
            type: "depository",
            subtype: "savings",
            balance: 5500.25,
            available: 5500.25,
            currencyCode: "USD",
          },
          {
            id: "acc_3",
            name: "Credit Card",
            type: "credit",
            subtype: "credit card",
            balance: 450.00,
            available: 9550.00,
            currencyCode: "USD",
          }
        ]
      }
    },
    metadata: {
      projections: [
        { month: 1, projectedBalance: 6500, confidence: "high" },
        { month: 2, projectedBalance: 6800, confidence: "medium" },
        { month: 3, projectedBalance: 7200, confidence: "low" },
      ]
    }
  },
  "transactions": {
    data: {
      structuredContent: {
        transactions: [
          {
            transaction_id: "tx_1",
            account_id: "acc_1",
            name: "Uber Ride",
            amount: 25.50,
            date: "2024-03-15",
            category: ["Transport", "Taxi"],
            merchant_name: "Uber",
            pending: false,
            iso_currency_code: "USD",
          },
          {
            transaction_id: "tx_2",
            account_id: "acc_3",
            name: "Whole Foods Market",
            amount: 145.32,
            date: "2024-03-14",
            category: ["Food", "Groceries"],
            merchant_name: "Whole Foods",
            pending: false,
            iso_currency_code: "USD",
          },
          {
            transaction_id: "tx_3",
            account_id: "acc_1",
            name: "Netflix Subscription",
            amount: 15.99,
            date: "2024-03-10",
            category: ["Entertainment", "Subscription"],
            merchant_name: "Netflix",
            pending: false,
            iso_currency_code: "USD",
          }
        ],
        totalTransactions: 3,
        displayedTransactions: 3,
        dateRange: {
          start: "2024-03-01",
          end: "2024-03-15",
        },
      }
    },
    metadata: {
      transactions: [
          {
            transaction_id: "tx_1",
            account_id: "acc_1",
            name: "Uber Ride",
            amount: 25.50,
            date: "2024-03-15",
            category: ["Transport", "Taxi"],
            merchant_name: "Uber",
            pending: false,
            iso_currency_code: "USD",
          },
          {
            transaction_id: "tx_2",
            account_id: "acc_3",
            name: "Whole Foods Market",
            amount: 145.32,
            date: "2024-03-14",
            category: ["Food", "Groceries"],
            merchant_name: "Whole Foods",
            pending: false,
            iso_currency_code: "USD",
          },
          {
            transaction_id: "tx_3",
            account_id: "acc_1",
            name: "Netflix Subscription",
            amount: 15.99,
            date: "2024-03-10",
            category: ["Entertainment", "Subscription"],
            merchant_name: "Netflix",
            pending: false,
            iso_currency_code: "USD",
          }
      ],
      categoryBreakdown: [
        { category: "Food", count: 1, total: 145.32 },
        { category: "Transport", count: 1, total: 25.50 },
        { category: "Entertainment", count: 1, total: 15.99 },
      ],
      summary: {
        totalSpending: 186.81,
        totalIncome: 0,
        netCashFlow: -186.81,
        pendingCount: 0,
        averageTransaction: 62.27,
      }
    }
  },
  "spending-insights": {
    data: {
      structuredContent: {
        categories: [
          { name: "Food & Dining", amount: 450.00, count: 12, percentage: 35 },
          { name: "Shopping", amount: 320.50, count: 5, percentage: 25 },
          { name: "Transportation", amount: 180.25, count: 8, percentage: 14 },
          { name: "Entertainment", amount: 150.00, count: 3, percentage: 12 },
          { name: "Bills & Utilities", amount: 180.00, count: 2, percentage: 14 },
        ],
        totalSpending: 1280.75,
        dateRange: {
          start: "2024-03-01",
          end: "2024-03-31",
        }
      }
    },
    metadata: {}
  },
  "account-health": {
    data: {
      accounts: [
        {
          account_id: "acc_1",
          name: "Checking",
          warnings: ["Low balance", "High spending velocity"],
        },
        {
          account_id: "acc_2",
          name: "Savings",
          warnings: [],
        },
        {
          account_id: "acc_3",
          name: "Credit Card",
          warnings: ["Near credit limit (95%)", "High utilization"],
        }
      ],
      overallStatus: "warning",
    },
    metadata: {}
  },
  "recurring-payments": {
    data: {
      structuredContent: {
        monthlyTotal: 145.99,
        subscriptionCount: 4,
        upcomingPayments: [
          { name: "Netflix", amount: 15.99, nextDate: "2024-03-20", frequency: "monthly", confidence: "high" },
          { name: "Spotify", amount: 9.99, nextDate: "2024-03-22", frequency: "monthly", confidence: "high" },
          { name: "Gym Membership", amount: 50.00, nextDate: "2024-04-01", frequency: "monthly", confidence: "medium" },
          { name: "Internet", amount: 70.00, nextDate: "2024-03-28", frequency: "monthly", confidence: "high" },
        ],
        highestSubscription: {
          name: "Internet",
          amount: 70.00,
          frequency: "monthly"
        }
      }
    },
    metadata: {}
  },
  "investments": {
    data: {
      structuredContent: {
        accounts: [
          {
            account_id: "inv_1",
            name: "Brokerage",
            type: "investment",
            subtype: "brokerage",
            mask: "4444",
            balances: {
              current: 15450.00,
              available: 15450.00,
              iso_currency_code: "USD",
            }
          }
        ],
        holdings: [
          {
            account_id: "inv_1",
            security_id: "sec_1",
            cost_basis: 140.50,
            institution_price: 175.25,
            institution_price_as_of: "2024-03-15",
            institution_value: 8762.50,
            iso_currency_code: "USD",
            quantity: 50,
            unofficial_currency_code: null,
          },
          {
            account_id: "inv_1",
            security_id: "sec_2",
            cost_basis: 320.00,
            institution_price: 334.50,
            institution_price_as_of: "2024-03-15",
            institution_value: 6690.00,
            iso_currency_code: "USD",
            quantity: 20,
            unofficial_currency_code: null,
          }
        ],
        securities: [
          {
            security_id: "sec_1",
            name: "Apple Inc.",
            ticker_symbol: "AAPL",
            is_cash_equivalent: false,
            type: "equity",
            close_price: 175.25,
            close_price_as_of: "2024-03-15",
            iso_currency_code: "USD",
            institution_id: null,
            institution_security_id: null,
            proxy_security_id: null,
            isin: null,
            cusip: null,
            sedol: null,
            unofficial_currency_code: null,
          },
          {
            security_id: "sec_2",
            name: "Microsoft Corp.",
            ticker_symbol: "MSFT",
            is_cash_equivalent: false,
            type: "equity",
            close_price: 334.50,
            close_price_as_of: "2024-03-15",
            iso_currency_code: "USD",
            institution_id: null,
            institution_security_id: null,
            proxy_security_id: null,
            isin: null,
            cusip: null,
            sedol: null,
            unofficial_currency_code: null,
          }
        ],
        totalValue: 15452.50,
        lastUpdated: "2024-03-15T10:30:00Z",
      }
    },
    metadata: {}
  },
  "liabilities": {
    data: {
      structuredContent: {
        accounts: [
          {
            account_id: "lia_1",
            name: "Mortgage",
            official_name: "Chase Mortgage",
            type: "loan",
            subtype: "mortgage",
            mask: "5555",
            balances: {
              current: 245000.00,
              available: null,
              limit: null,
              iso_currency_code: "USD",
            }
          },
          {
            account_id: "lia_2",
            name: "Student Loan",
            official_name: "Navient Student Loan",
            type: "loan",
            subtype: "student",
            mask: "6666",
            balances: {
              current: 12500.00,
              available: null,
              limit: null,
              iso_currency_code: "USD",
            }
          }
        ],
        credit: [],
        student: [
          {
            account_id: "lia_2",
            account_number: "xxxx6666",
            disbursement_dates: ["2018-09-01"],
            expected_payoff_date: "2028-09-01",
            guarantor: "Dept of Ed",
            interest_rate_percentage: 4.5,
            is_overdue: false,
            last_payment_amount: 150.00,
            last_payment_date: "2024-02-15",
            last_statement_issue_date: "2024-02-28",
            loan_name: "Stafford Subsidized",
            loan_status: { end_date: null, type: "repayment" },
            minimum_payment_amount: 150.00,
            next_payment_due_date: "2024-03-15",
            origination_date: "2018-09-01",
            origination_principal_amount: 15000.00,
            outstanding_interest_amount: 45.00,
            payment_reference_number: null,
            pslf_status: null,
            repayment_plan: { description: "Standard", type: "standard" },
            sequence_number: "1",
            servicer_address: { city: "Reston", country: "US", postal_code: "20190", region: "VA", street: "123 Sallie Mae Dr" },
            ytd_interest_paid: 120.00,
            ytd_principal_paid: 300.00,
          }
        ],
        mortgage: [
          {
            account_id: "lia_1",
            account_number: "xxxx5555",
            current_late_fee: 0,
            escrow_balance: 2400.00,
            has_pmi: false,
            has_prepayment_penalty: false,
            interest_rate: { percentage: 3.25, type: "fixed" },
            last_payment_amount: 1800.00,
            last_payment_date: "2024-03-01",
            loan_type_description: "Conventional 30yr Fixed",
            loan_term: "360 months",
            maturity_date: "2050-08-01",
            next_monthly_payment: 1800.00,
            next_payment_due_date: "2024-04-01",
            origination_date: "2020-08-01",
            origination_principal_amount: 280000.00,
            past_due_amount: 0,
            property_address: { city: "San Francisco", country: "US", postal_code: "94105", region: "CA", street: "123 Market St" },
            ytd_interest_paid: 2400.00,
            ytd_principal_paid: 3000.00,
          }
        ],
        summary: {
          totalDebt: 257500.00,
          totalMinimumPayment: 1950.00,
          accountsOverdue: 0,
          nextPaymentDue: "2024-03-15",
        },
        lastUpdated: "2024-03-15T10:30:00Z",
      }
    },
    metadata: {}
  },
  "business-cashflow": {
    data: {
      structuredContent: {
        runway: {
          months: 8.5,
          endDate: "2024-11-15",
          confidence: "medium",
        },
        currentPeriod: {
          revenue: 45000.00,
          expenses: 32000.00,
          net: 13000.00,
          burnRate: 15000.00, // Average monthly burn
        },
        projections: [
          { period: "Apr 2024", projectedNet: 14000, confidence: "high" },
          { period: "May 2024", projectedNet: 12500, confidence: "medium" },
          { period: "Jun 2024", projectedNet: 11000, confidence: "low" },
        ],
        healthStatus: "stable",
      }
    },
    metadata: {}
  },
  "connect-item": {
    data: {
      structuredContent: {
        items: [
          {
            id: "item_1",
            institutionId: "ins_1",
            institutionName: "Chase Bank",
            institutionLogo: null,
            accountCount: 3,
            status: "good",
            errorCode: null,
            errorMessage: null,
            connectedAt: "2024-01-15T10:00:00Z",
          }
        ],
        planLimits: {
          current: 1,
          max: 3,
          maxFormatted: "3",
          planName: "Pro",
        },
        deletionStatus: {
          canDelete: true,
        },
        canConnect: true,
      }
    },
    metadata: {
      baseUrl: "http://localhost:3000",
      mcpToken: "mock-token-123"
    }
  },
  "subscription-required": {
    data: {
      structuredContent: {
        featureName: "Advanced Analytics",
        error_message: "This feature requires a premium subscription.",
        pricingUrl: "/pricing",
        userId: "user_123",
      }
    },
    metadata: {}
  },
  "plaid-required": {
    data: {
      structuredContent: {
        featureName: "Transactions",
        error_message: "Please connect a bank account to view transactions.",
        pricingUrl: "/connect-bank",
        userId: "user_123",
      }
    },
    metadata: {}
  },
  "expense-categorizer": {
    data: {
      structuredContent: {
        categorized: 45,
        needsReview: 5,
        taxCategories: {
          "Business Meals": 450.00,
          "Office Supplies": 120.00,
          "Travel": 1200.00,
        },
        totalAmount: 1770.00,
      }
    },
    metadata: {
      confidenceDistribution: {
        high: 35,
        medium: 10,
        low: 5,
      }
    }
  },
  "manage-subscription": {
    data: {
      structuredContent: {
        billingPortalUrl: "https://billing.stripe.com/p/session/...",
        currentPlan: "Pro Plan",
        message: "You are currently on the Pro Plan. Your next billing date is April 1, 2024.",
      }
    },
    metadata: {}
  },
  "test-widget": {
    data: {
      structuredContent: {
        message: "This is a test widget message.",
      }
    },
    metadata: {}
  }
};
