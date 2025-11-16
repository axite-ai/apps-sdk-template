import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import type { AccountBase, LiabilitiesObject } from "plaid";
import {
  getAccountBalances,
  getTransactions,
  getSpendingInsights,
  checkAccountHealth,
  getInvestmentHoldings,
  getLiabilities,
} from "@/lib/services/plaid-service";
import { UserService } from "@/lib/services/user-service";
import { auth } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/utils/subscription-helpers";
import {
  createLoginPromptResponse,
  createSubscriptionRequiredResponse,
  createPlaidRequiredResponse,
} from "@/lib/utils/auth-responses";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/utils/mcp-response-helpers";
import { createTextContent } from "@/lib/types/mcp-responses";
import type {
  AccountBalancesResponse,
  TransactionsResponse,
  SpendingInsightsResponse,
  AccountHealthResponse,
  FinancialTipsResponse,
  BudgetCalculationResponse,
  MessageResponse,
  SubscriptionManagementResponse,
  InvestmentHoldingsResponse,
  LiabilitiesResponse,
} from "@/lib/types/tool-responses";
import { withMcpAuth } from "better-auth/plugins";
import { baseURL } from "@/baseUrl";
import { logOAuthRequest, logOAuthError } from "@/lib/auth/oauth-logger";

console.log("Auth API methods at startup:", Object.keys(auth.api));

// Helper to fetch HTML from Next.js pages (Vercel template pattern)
const getAppsSdkCompatibleHtml = async (baseUrl: string, path: string) => {
  const result = await fetch(`${baseUrl}${path}`);
  return await result.text();
};

// Note: securitySchemes is required by OpenAI Apps SDK spec but not yet in MCP SDK types
// We use @ts-expect-error to suppress these known type mismatches

const handler = withMcpAuth(auth, async (req, session) => {
  // Detailed session logging
  console.log("[MCP] Session received:", {
    hasSession: !!session,
    userId: session?.userId,
    clientId: session?.clientId,
    scopes: session?.scopes,
    accessTokenExpiry: session?.accessTokenExpiresAt,
    isExpired: session?.accessTokenExpiresAt ? new Date(session.accessTokenExpiresAt) < new Date() : null,
  });

  // Log the request details
  const url = new URL(req.url);
  const authHeader = req.headers.get('authorization');
  console.log("[MCP] Request details:", {
    method: req.method,
    path: url.pathname,
    searchParams: Object.fromEntries(url.searchParams),
    hasAuthHeader: !!authHeader,
    authType: authHeader?.split(' ')[0],
  });

  // Clone request to read body without consuming it
  const clonedReq = req.clone();
  try {
    const body = await clonedReq.text();
    if (body) {
      const parsed = JSON.parse(body);
      console.log("[MCP] Request body:", {
        method: parsed.method,
        id: parsed.id,
        paramsKeys: parsed.params ? Object.keys(parsed.params) : [],
      });
    }
  } catch {
    // Ignore if body can't be read
  }

  return createMcpHandler(async (server) => {
    // ============================================================================
    // WIDGET RESOURCES
    // ============================================================================
    // Fetch HTML from Next.js pages (Vercel template pattern)
    const widgets = [
      { id: 'account-balances', title: 'Account Balances Widget', description: 'Interactive account balances view', path: '/widgets/account-balances' },
      { id: 'transactions', title: 'Transactions Widget', description: 'Transaction list with details', path: '/widgets/transactions' },
      { id: 'spending-insights', title: 'Spending Insights Widget', description: 'Category-based spending breakdown', path: '/widgets/spending-insights' },
      { id: 'account-health', title: 'Account Health Widget', description: 'Account health status and warnings', path: '/widgets/account-health' },
      { id: 'investments', title: 'Investment Holdings Widget', description: 'Investment holdings and securities details', path: '/widgets/investments' },
      { id: 'liabilities', title: 'Liabilities Widget', description: 'Detailed view of credit cards, loans, and mortgages', path: '/widgets/liabilities' },
      { id: 'plaid-required', title: 'Connect Bank Account', description: 'Prompts user to connect their bank account via Plaid', path: '/widgets/plaid-required' },
      { id: 'subscription-required', title: 'Choose Subscription Plan', description: 'Select and subscribe to a plan to unlock features', path: '/widgets/subscription-required' },
      { id: 'manage-subscription', title: 'Manage Subscription', description: 'Update or cancel your subscription', path: '/widgets/manage-subscription' },
    ];

    for (const widget of widgets) {
      server.registerResource(
        widget.id,
        `ui://widget/${widget.id}.html`,
        {
          title: widget.title,
          description: widget.description,
          mimeType: 'text/html+skybridge',
          _meta: {
            'openai/widgetDescription': widget.description,
            'openai/widgetPrefersBorder': true,
          },
        },
        async () => {
          // Fetch HTML from Next.js at runtime
          const html = await getAppsSdkCompatibleHtml(baseURL, widget.path);
          return {
            contents: [{
              uri: `ui://widget/${widget.id}.html`,
              mimeType: 'text/html+skybridge',
              text: html,
              _meta: {
                'openai/widgetDescription': widget.description,
                'openai/widgetPrefersBorder': true,
                'openai/widgetCSP': {
                  connect_domains: [baseURL],
                  resource_domains: [
                    baseURL,
                    'https://*.plaid.com',
                  ],
                },
              },
            }],
          };
        }
      );
      console.log(`[MCP] Registered widget: ${widget.id} (fetches from ${widget.path})`);
    }

    // ============================================================================
    // AUTHENTICATED PLAID TOOLS
    // ============================================================================

    // Get Account Balances
    const getAccountBalancesConfig = {
      title: "Get Account Balances",
      description: "Get current account balances and details for all linked accounts. Shows an interactive card view. Requires authentication.",
      inputSchema: {
        _meta: z.any().optional().describe("OpenAI Apps SDK metadata"),
      },
      _meta: {
        securitySchemes: [{ type: "oauth2" }], // Back-compat mirror for ChatGPT
        "openai/outputTemplate": "ui://widget/account-balances.html",
        "openai/toolInvocation/invoking": "Fetching your account balances",
        "openai/toolInvocation/invoked": "Retrieved account balances",
      },
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
      securitySchemes: [{ type: "oauth2" }],
    };

    console.log("[MCP] Registering tool: get_account_balances", {
      securitySchemes: getAccountBalancesConfig.securitySchemes,
      annotations: getAccountBalancesConfig.annotations,
    });

    server.registerTool(
      "get_account_balances",
      {
        title: "Get Account Balances",
        description: "Get current account balances and details for all linked accounts. Shows an interactive card view. Requires authentication.",
        inputSchema: {
          _meta: z.any().optional().describe("OpenAI Apps SDK metadata"),
        },
        _meta: {
          "openai/toolInvocation/invoking": "Fetching your account balances",
          "openai/toolInvocation/invoked": "Retrieved account balances",
        },
        annotations: {
          destructiveHint: false,
          openWorldHint: false,
          readOnlyHint: true,
        },
        // @ts-expect-error - securitySchemes not yet in MCP SDK types
        securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["balances:read"] }],
      },
    async () => {
      try {
        if (!session || !(await hasActiveSubscription(session.userId))) {
          return createSubscriptionRequiredResponse("account balances", session?.userId);
        }

          // Check 3: Plaid Connection
          const accessTokens = await UserService.getUserAccessTokens(session.userId);
          if (accessTokens.length === 0) {
            return await createPlaidRequiredResponse(session.userId, req.headers);
          }

        // Fetch balances from all connected accounts
        const allAccounts = [];
        for (const accessToken of accessTokens) {
          const balances = await getAccountBalances(accessToken);
          allAccounts.push(...balances.accounts);
        }

        // Calculate total balance
        const totalBalance = allAccounts.reduce((sum, account) => {
          return sum + (account.balances.current || 0);
        }, 0);

        return createSuccessResponse(
          `Found ${allAccounts.length} account(s) with a total balance of $${totalBalance.toFixed(2)}`,
          {
            accounts: allAccounts,
            totalBalance,
            lastUpdated: new Date().toISOString(),
          }
        );
      } catch (error) {
        console.error("[Tool] get_account_balances error", { error });
        return createErrorResponse(
          error instanceof Error ? error.message : "Failed to fetch account balances"
        );
      }
    }
  );

  // Get Transactions
  server.registerTool(
    "get_transactions",
    {
      title: "Get Transactions",
      description: "Get recent transactions for all accounts with rich details including merchant logos, categories, locations, and payment info. Shows an interactive transaction list with filtering and grouping. Requires authentication.",
      inputSchema: {
        startDate: z.string().optional().describe("Start date in YYYY-MM-DD format. Defaults to 30 days ago."),
        endDate: z.string().optional().describe("End date in YYYY-MM-DD format. Defaults to today."),
        limit: z.number().optional().describe("Maximum number of transactions to return. Defaults to 100."),
        category: z.string().optional().describe("Filter by personal_finance_category primary category (e.g., 'FOOD_AND_DRINK', 'TRANSFER_IN')"),
        paymentChannel: z.enum(["online", "in store", "other"]).optional().describe("Filter by payment channel"),
        includePending: z.boolean().optional().describe("Include pending transactions. Defaults to true."),
      },
      _meta: {
        securitySchemes: [{ type: "oauth2" }], // Back-compat mirror for ChatGPT
        "openai/outputTemplate": "ui://widget/transactions.html",
        "openai/toolInvocation/invoking": "Fetching transactions...",
        "openai/toolInvocation/invoked": "Transactions retrieved",
      },
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
      // @ts-expect-error - securitySchemes not yet in MCP SDK types
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["transactions:read"] }],
    },
    async ({ startDate, endDate, limit, category, paymentChannel, includePending = true }: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      category?: string;
      paymentChannel?: "online" | "in store" | "other";
      includePending?: boolean;
    }) => {
      try {
        if (!session || !(await hasActiveSubscription(session.userId))) {
          return createSubscriptionRequiredResponse("transactions", session?.userId);
        }

        // Check 3: Plaid Connection
        const accessTokens = await UserService.getUserAccessTokens(session.userId);
        if (accessTokens.length === 0) {
          return await createPlaidRequiredResponse(session.userId, req.headers);
        }

        // Default date range: last 30 days
        const end = endDate || new Date().toISOString().split("T")[0];
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        // Fetch transactions from all accounts
        const allTransactions = [];
        for (const accessToken of accessTokens) {
          const result = await getTransactions(accessToken, start, end);
          allTransactions.push(...result.transactions);
        }

        // Apply filters
        let filteredTransactions = allTransactions;

        // Filter by pending status
        if (!includePending) {
          filteredTransactions = filteredTransactions.filter(tx => !tx.pending);
        }

        // Filter by category
        if (category) {
          filteredTransactions = filteredTransactions.filter(tx =>
            tx.personal_finance_category?.primary === category
          );
        }

        // Filter by payment channel
        if (paymentChannel) {
          filteredTransactions = filteredTransactions.filter(tx =>
            tx.payment_channel === paymentChannel
          );
        }

        // Sort by date (most recent first) and limit
        filteredTransactions.sort((a, b) => {
          const dateA = new Date(a.authorized_date || a.date).getTime();
          const dateB = new Date(b.authorized_date || b.date).getTime();
          return dateB - dateA;
        });
        const limitedTransactions = filteredTransactions.slice(0, limit || 100);

        // Calculate metadata
        const categoryBreakdown = new Map<string, { count: number; total: number }>();
        const merchantBreakdown = new Map<string, { name: string; count: number; total: number }>();
        let totalSpending = 0;
        let totalIncome = 0;
        let pendingCount = 0;

        for (const tx of limitedTransactions) {
          // Category breakdown
          const cat = tx.personal_finance_category?.primary || 'UNCATEGORIZED';
          const catData = categoryBreakdown.get(cat) || { count: 0, total: 0 };
          categoryBreakdown.set(cat, {
            count: catData.count + 1,
            total: catData.total + tx.amount
          });

          // Merchant breakdown
          const merchantName = tx.merchant_name || tx.name || 'Unknown';
          const merchantId = tx.merchant_entity_id || merchantName;
          const merchData = merchantBreakdown.get(merchantId) || { name: merchantName, count: 0, total: 0 };
          merchantBreakdown.set(merchantId, {
            name: merchantName,
            count: merchData.count + 1,
            total: merchData.total + tx.amount
          });

          // Spending totals
          if (tx.amount > 0) {
            totalSpending += tx.amount;
          } else {
            totalIncome += Math.abs(tx.amount);
          }

          if (tx.pending) {
            pendingCount++;
          }
        }

        return createSuccessResponse(
          `Found ${limitedTransactions.length} transaction(s) from ${start} to ${end}` +
          (category ? ` in category ${category}` : '') +
          (paymentChannel ? ` via ${paymentChannel}` : ''),
          {
            transactions: limitedTransactions,
            totalTransactions: allTransactions.length,
            displayedTransactions: limitedTransactions.length,
            dateRange: { start, end },
            metadata: {
              categoryBreakdown: Array.from(categoryBreakdown.entries()).map(([cat, data]) => ({
                category: cat,
                count: data.count,
                total: data.total
              })).sort((a, b) => b.total - a.total),
              topMerchants: Array.from(merchantBreakdown.entries())
                .map(([id, data]) => ({
                  merchantId: id,
                  name: data.name,
                  count: data.count,
                  total: data.total
                }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10),
              summary: {
                totalSpending,
                totalIncome,
                netCashFlow: totalIncome - totalSpending,
                pendingCount,
                averageTransaction: limitedTransactions.length > 0
                  ? limitedTransactions.reduce((sum, tx) => sum + tx.amount, 0) / limitedTransactions.length
                  : 0
              }
            }
          }
        );
      } catch (error) {
        console.error("[Tool] get_transactions error", { error });
        return createErrorResponse(
          error instanceof Error ? error.message : "Failed to fetch transactions"
        );
      }
    }
  );

  // Get Spending Insights
  server.registerTool(
    "get_spending_insights",
    {
      title: "Get Spending Insights",
      description: "Analyze spending patterns by category. Shows an interactive visualization. Requires authentication.",
      inputSchema: {
        startDate: z.string().optional().describe("Start date in YYYY-MM-DD format. Defaults to 30 days ago."),
        endDate: z.string().optional().describe("End date in YYYY-MM-DD format. Defaults to today."),
      },
      _meta: {
        securitySchemes: [{ type: "oauth2" }], // Back-compat mirror for ChatGPT
        "openai/outputTemplate": "ui://widget/spending-insights.html",
        "openai/toolInvocation/invoking": "Analyzing spending...",
        "openai/toolInvocation/invoked": "Spending analysis ready",
      },
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
      // @ts-expect-error - securitySchemes not yet in MCP SDK types
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["insights:read"] }],
    },
    async ({ startDate, endDate }: { startDate?: string; endDate?: string }) => {
      try {
        if (!session || !(await hasActiveSubscription(session.userId))) {
          return createSubscriptionRequiredResponse("spending insights", session?.userId);
        }

        // Check 3: Plaid Connection
        const accessTokens = await UserService.getUserAccessTokens(session.userId);
        if (accessTokens.length === 0) {
          return await createPlaidRequiredResponse(session.userId, req.headers);
        }

        const end = endDate || new Date().toISOString().split("T")[0];
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        // Get spending insights from all accounts
        const allInsights = [];
        for (const accessToken of accessTokens) {
          const insights = await getSpendingInsights(accessToken, start, end);
          allInsights.push(insights);
        }

        // Merge insights from multiple accounts
        const categoryMap = new Map<string, { amount: number; count: number }>();
        let totalSpending = 0;

        for (const insights of allInsights) {
          for (const cat of insights.categoryBreakdown) {
            const existing = categoryMap.get(cat.category) || { amount: 0, count: 0 };
            categoryMap.set(cat.category, {
              amount: existing.amount + cat.amount,
              count: existing.count + 1,
            });
            totalSpending += cat.amount;
          }
        }

        // Convert to array and calculate percentages
        const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
          name,
          amount: data.amount,
          count: data.count,
          percentage: totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0,
        }));

        // Sort by amount (highest first)
        categories.sort((a, b) => b.amount - a.amount);

        const output = {
          categories,
          totalSpending,
          dateRange: { start, end },
        };

        return createSuccessResponse(
          `Total spending: $${totalSpending.toFixed(2)} across ${categories.length} categories from ${start} to ${end}`,
          output
        );
      } catch (error) {
        console.error("[Tool] get_spending_insights error", { error });
        return createErrorResponse(
          error instanceof Error ? error.message : "Failed to analyze spending"
        );
      }
    }
  );

  // Check Account Health
  server.registerTool(
    "check_account_health",
    {
      title: "Check Account Health",
      description: "Get account health information including balances, warnings, and status. Requires authentication.",
      inputSchema: {},
      _meta: {
        securitySchemes: [{ type: "oauth2" }], // Back-compat mirror for ChatGPT
        "openai/outputTemplate": "ui://widget/account-health.html",
        "openai/toolInvocation/invoking": "Checking account health...",
        "openai/toolInvocation/invoked": "Health check complete",
      },
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
      // @ts-expect-error - securitySchemes not yet in MCP SDK types
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["health:read"] }],
    },
    async () => {
      try {
        if (!session) {
          return createLoginPromptResponse("account health check");
        }

        // Check 2: Active Subscription
        const hasSubscription = await hasActiveSubscription(session.userId);
        if (!hasSubscription) {
          return createSubscriptionRequiredResponse("account health check", session.userId);
        }

        // Check 3: Plaid Connection
        const accessTokens = await UserService.getUserAccessTokens(session.userId);
        if (accessTokens.length === 0) {
          return await createPlaidRequiredResponse(session.userId, req.headers);
        }

        // Collect health data from all accounts
        const allAccounts = [];
        let overallStatus: "healthy" | "attention_needed" = "healthy";

        for (const accessToken of accessTokens) {
          const health = await checkAccountHealth(accessToken);
          allAccounts.push(...health.accounts);

          if (health.overallStatus === "attention_needed") {
            overallStatus = "attention_needed";
          }
        }

        const totalWarnings = allAccounts.reduce((sum, account) => sum + account.warnings.length, 0);

        const output = {
          accounts: allAccounts,
          overallStatus,
          summary: {
            totalAccounts: allAccounts.length,
            accountsWithWarnings: allAccounts.filter((a) => a.warnings.length > 0).length,
          },
        };

        const statusEmoji = overallStatus === "healthy" ? "✅" : "⚠️";
        const statusText =
          overallStatus === "healthy"
            ? "All accounts are in good standing."
            : `${totalWarnings} warning(s) detected across ${output.summary.accountsWithWarnings} account(s).`;

        return createSuccessResponse(
          `${statusEmoji} ${statusText}\n\nChecked ${allAccounts.length} account(s).`,
          output
        );
      } catch (error) {
        console.error("[Tool] check_account_health error", { error });
        return createErrorResponse(
          error instanceof Error ? error.message : "Failed to check account health"
        );
      }
    }
  );

  // Get Investment Holdings
  server.registerTool(
    "get_investment_holdings",
    {
      title: "Get Investment Holdings",
      description: "Get investment holdings, securities details, and portfolio value for all investment accounts. Shows an interactive portfolio view. Requires authentication.",
      inputSchema: {},
      _meta: {
        "openai/outputTemplate": "ui://widget/investments.html",
        "openai/toolInvocation/invoking": "Fetching investment holdings...",
        "openai/toolInvocation/invoked": "Investment holdings retrieved",
      },
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
      // @ts-expect-error - securitySchemes not yet in MCP SDK types
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["investments:read"] }],
    },
    async () => {
      try {
        if (!session || !(await hasActiveSubscription(session.userId))) {
          return createSubscriptionRequiredResponse("investment holdings", session?.userId);
        }

        // Check Plaid Connection
        const accessTokens = await UserService.getUserAccessTokens(session.userId);
        if (accessTokens.length === 0) {
          return await createPlaidRequiredResponse(session.userId, req.headers);
        }

        // Fetch holdings from all connected accounts
        const allAccounts = [];
        const allHoldings = [];
        const allSecurities = [];
        const securitiesMap = new Map<string, unknown>();

        for (const accessToken of accessTokens) {
          const data = await getInvestmentHoldings(accessToken);
          allAccounts.push(...data.accounts);
          allHoldings.push(...data.holdings);

          // Deduplicate securities by security_id
          for (const security of data.securities) {
            if (!securitiesMap.has(security.security_id)) {
              securitiesMap.set(security.security_id, security);
              allSecurities.push(security);
            }
          }
        }

        // Calculate total portfolio value
        const totalValue = allHoldings.reduce((sum, holding) => {
          return sum + (holding.institution_value || 0);
        }, 0);

        return createSuccessResponse(
          `Found ${allHoldings.length} holding(s) across ${allAccounts.length} investment account(s) with a total value of $${totalValue.toFixed(2)}`,
          {
            accounts: allAccounts,
            holdings: allHoldings,
            securities: allSecurities,
            totalValue,
            lastUpdated: new Date().toISOString(),
          }
        );
      } catch (error) {
        console.error("[Tool] get_investment_holdings error", { error });
        return createErrorResponse(
          error instanceof Error ? error.message : "Failed to fetch investment holdings"
        );
      }
    }
  );

  // Get Liabilities
  server.registerTool(
    "get_liabilities",
    {
      title: "Get Liabilities",
      description: "Get detailed information about all liabilities including credit cards, student loans, and mortgages. Shows payment schedules, interest rates, and debt summary. Requires authentication.",
      inputSchema: {},
      _meta: {
        "openai/outputTemplate": "ui://widget/liabilities.html",
        "openai/toolInvocation/invoking": "Fetching liability information...",
        "openai/toolInvocation/invoked": "Liabilities retrieved",
      },
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
      // @ts-expect-error - securitySchemes not yet in MCP SDK types
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["liabilities:read"] }],
    },
    async () => {
      try {
        if (!session || !(await hasActiveSubscription(session.userId))) {
          return createSubscriptionRequiredResponse("liabilities", session?.userId);
        }

        // Check Plaid Connection
        const accessTokens = await UserService.getUserAccessTokens(session.userId);
        if (accessTokens.length === 0) {
          return await createPlaidRequiredResponse(session.userId, req.headers);
        }

        // Fetch liabilities from all connected accounts
        const allAccounts: AccountBase[] = [];
        const allCredit: NonNullable<LiabilitiesObject['credit']> = [];
        const allStudent: NonNullable<LiabilitiesObject['student']> = [];
        const allMortgage: NonNullable<LiabilitiesObject['mortgage']> = [];

        for (const accessToken of accessTokens) {
          const { accounts, liabilities } = await getLiabilities(accessToken);
          allAccounts.push(...accounts);

          if (liabilities.credit) {
            allCredit.push(...liabilities.credit);
          }
          if (liabilities.student) {
            allStudent.push(...liabilities.student);
          }
          if (liabilities.mortgage) {
            allMortgage.push(...liabilities.mortgage);
          }
        }

        // Calculate summary statistics
        let totalDebt = 0;
        let totalMinimumPayment = 0;
        let accountsOverdue = 0;
        let earliestPaymentDue: string | null = null;

        // Calculate from credit cards
        for (const credit of allCredit) {
          const account = allAccounts.find(a => a.account_id === credit.account_id);
          if (account?.balances?.current) {
            totalDebt += Math.abs(account.balances.current);
          }
          if (credit.minimum_payment_amount) {
            totalMinimumPayment += credit.minimum_payment_amount;
          }
          if (credit.is_overdue) {
            accountsOverdue++;
          }
          if (credit.next_payment_due_date) {
            if (!earliestPaymentDue || credit.next_payment_due_date < earliestPaymentDue) {
              earliestPaymentDue = credit.next_payment_due_date;
            }
          }
        }

        // Calculate from student loans
        for (const student of allStudent) {
          const account = allAccounts.find(a => a.account_id === student.account_id);
          if (account?.balances?.current) {
            totalDebt += account.balances.current;
          }
          if (student.minimum_payment_amount) {
            totalMinimumPayment += student.minimum_payment_amount;
          }
          if (student.is_overdue) {
            accountsOverdue++;
          }
          if (student.next_payment_due_date) {
            if (!earliestPaymentDue || student.next_payment_due_date < earliestPaymentDue) {
              earliestPaymentDue = student.next_payment_due_date;
            }
          }
        }

        // Calculate from mortgages
        for (const mortgage of allMortgage) {
          const account = allAccounts.find(a => a.account_id === mortgage.account_id);
          if (account?.balances?.current) {
            totalDebt += account.balances.current;
          }
          if (mortgage.next_monthly_payment) {
            totalMinimumPayment += mortgage.next_monthly_payment;
          }
          if (mortgage.past_due_amount && mortgage.past_due_amount > 0) {
            accountsOverdue++;
          }
          if (mortgage.next_payment_due_date) {
            if (!earliestPaymentDue || mortgage.next_payment_due_date < earliestPaymentDue) {
              earliestPaymentDue = mortgage.next_payment_due_date;
            }
          }
        }

        const output = {
          accounts: allAccounts.map(account => ({
            account_id: account.account_id,
            name: account.name,
            official_name: account.official_name,
            type: account.type,
            subtype: account.subtype,
            mask: account.mask,
            balances: {
              current: account.balances.current,
              available: account.balances.available,
              limit: account.balances.limit,
              iso_currency_code: account.balances.iso_currency_code || 'USD',
            },
          })),
          credit: allCredit,
          student: allStudent,
          mortgage: allMortgage,
          summary: {
            totalDebt,
            totalMinimumPayment,
            accountsOverdue,
            nextPaymentDue: earliestPaymentDue,
          },
          lastUpdated: new Date().toISOString(),
        };

        const totalLiabilities = allCredit.length + allStudent.length + allMortgage.length;
        const liabilityBreakdown = [
          allCredit.length > 0 && `${allCredit.length} credit card(s)`,
          allStudent.length > 0 && `${allStudent.length} student loan(s)`,
          allMortgage.length > 0 && `${allMortgage.length} mortgage(s)`,
        ].filter(Boolean).join(', ');

        return createSuccessResponse(
          `Found ${totalLiabilities} liabilities: ${liabilityBreakdown}.\n\n` +
          `Total debt: $${totalDebt.toFixed(2)}\n` +
          `Minimum payments due: $${totalMinimumPayment.toFixed(2)}` +
          (accountsOverdue > 0 ? `\n⚠️ ${accountsOverdue} account(s) overdue` : ''),
          output
        );
      } catch (error) {
        console.error("[Tool] get_liabilities error", { error });
        return createErrorResponse(
          error instanceof Error ? error.message : "Failed to fetch liabilities"
        );
      }
    }
  );

    // Manage Subscription
    server.registerTool(
      "manage_subscription",
      {
        title: "Manage Subscription",
        description: "Access the billing portal to update or cancel your subscription. Shows an interactive widget with subscription management options. Requires authentication and active subscription.",
        inputSchema: {},
        _meta: {
          "openai/outputTemplate": "ui://widget/manage-subscription.html",
          "openai/toolInvocation/invoking": "Loading subscription management...",
          "openai/toolInvocation/invoked": "Subscription management ready",
          "openai/widgetAccessible": true,
        },
        annotations: {
          destructiveHint: false,
          openWorldHint: false,
          readOnlyHint: true,
        },
        // @ts-expect-error - securitySchemes not yet in MCP SDK types
        securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["subscription:manage"] }],
      },
      async () => {
        try {
          if (!session) {
            return createLoginPromptResponse("subscription management");
          }

          // Check if user has active subscription
          const hasSubscription = await hasActiveSubscription(session.userId);
          if (!hasSubscription) {
            return createSubscriptionRequiredResponse("subscription management", session.userId);
          }

          // Get billing portal URL from environment
          const billingPortalUrl = process.env.STRIPE_BILLING_PORTAL_URL;
          if (!billingPortalUrl) {
            return createErrorResponse("Billing portal URL not configured. Please contact support.");
          }

          // Get user's current plan (optional - for display purposes)
          const ctx = await auth.$context;
          const subscriptions = await ctx.adapter.findMany({
            model: "subscription",
            where: [{ field: "referenceId", value: session.userId }],
          }) as Array<{ plan: string }>;

          const currentPlan = subscriptions?.[0]?.plan || "unknown";

          return createSuccessResponse(
            "Click the link below to manage your subscription, update payment methods, or view billing history.",
            {
              billingPortalUrl,
              currentPlan,
              message: "Manage your subscription through the Stripe billing portal.",
            }
          );
        } catch (error) {
          console.error("[Tool] manage_subscription error", { error });
          return createErrorResponse(
            error instanceof Error ? error.message : "Failed to access subscription management"
          );
        }
      }
    );

    // ============================================================================
    // TEST WIDGET
    // ============================================================================
    server.registerTool(
      "test_widget",
      {
        title: "Test Widget",
        description: "A simple widget to test basic functionality.",
        inputSchema: {},
        _meta: {
          // Widget template removed until implemented
        },
        // @ts-expect-error - securitySchemes not yet in MCP SDK types
        securitySchemes: [{ type: "noauth" }],
      },
      async () => {
        return createSuccessResponse(
          "Hello from the test widget!",
          {
            message: "Hello from the test widget!",
          }
        );
      }
    );

    // ============================================================================
    // SUBSCRIPTION CHECKOUT
    // ============================================================================
    // NOTE: Subscription checkout is now handled by the subscription-required widget
    // via server actions that call auth.api.upgradeSubscription() with admin API key.
    // This ensures Better Auth properly processes webhooks and creates subscription records.
    // The old create_checkout_session tool has been removed.

    // ============================================================================
    // ADVANCED TEST WIDGET
    // ============================================================================
    server.registerTool(
      "advanced_test_widget",
      {
        title: "Advanced Test Widget",
        description: "A more complex widget to test state and tool calls.",
        inputSchema: {},
        _meta: {
          // Widget template removed until implemented
        },
        // @ts-expect-error - securitySchemes not yet in MCP SDK types
        securitySchemes: [{ type: "noauth" }],
      },
      async () => {
        return createSuccessResponse(
          "Advanced test widget loaded.",
          {
            message: "Initial message",
          }
        );
      }
    );

    server.registerTool(
      "test_widget_action",
      {
        title: "Test Widget Action",
        description: "A simple action that can be called from the advanced test widget.",
        inputSchema: {
          current_count: z.number(),
        },
        // @ts-expect-error - securitySchemes not yet in MCP SDK types
        securitySchemes: [{ type: "noauth" }],
      },
      async (args: Record<string, unknown>) => {
        const { current_count } = args as { current_count: number };
        return createSuccessResponse(
          `The count is ${current_count}.`,
          {
            message: `The count from the tool call is ${current_count}.`,
          }
        );
      }
    );
  // ============================================================================
  // FREE TIER TOOLS (No Authentication Required)
  // ============================================================================

  // Get Financial Tips
  server.registerTool(
    "get_financial_tips",
    {
      title: "Get Financial Tips",
      description: "Get educational financial advice on budgeting, saving, investing, debt management, or credit. Free tool, no authentication required.",
      inputSchema: {
        topic: z
          .enum(["budgeting", "saving", "investing", "debt", "credit", "general"])
          .optional()
          .describe("The financial topic to get tips about. Defaults to 'general'."),
      },
      outputSchema: {
        topic: z.string(),
        tips: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
            category: z.string(),
          })
        ),
        resources: z.array(z.string()).optional(),
      },
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
      // @ts-expect-error - securitySchemes not yet in MCP SDK types
      securitySchemes: [{ type: "noauth" }],
    },
    async ({ topic = "general" }: { topic?: string }) => {
      // Educational financial tips organized by topic
      const tipsByTopic: Record<string, Array<{ title: string; description: string; category: string }>> = {
        budgeting: [
          {
            title: "Follow the 50/30/20 Rule",
            description: "Allocate 50% of income to needs, 30% to wants, and 20% to savings and debt repayment.",
            category: "budgeting",
          },
          {
            title: "Track Every Expense",
            description: "Use a budgeting app or spreadsheet to monitor where your money goes each month.",
            category: "budgeting",
          },
          {
            title: "Create a Zero-Based Budget",
            description: "Assign every dollar a purpose so income minus expenses equals zero.",
            category: "budgeting",
          },
          {
            title: "Review and Adjust Monthly",
            description: "Analyze your spending patterns and adjust your budget categories as needed.",
            category: "budgeting",
          },
        ],
        saving: [
          {
            title: "Build an Emergency Fund",
            description: "Save 3-6 months of expenses in a high-yield savings account for unexpected costs.",
            category: "saving",
          },
          {
            title: "Automate Your Savings",
            description: "Set up automatic transfers to savings accounts on payday.",
            category: "saving",
          },
          {
            title: "Use the Pay Yourself First Method",
            description: "Save a percentage of income before spending on anything else.",
            category: "saving",
          },
          {
            title: "Take Advantage of Employer Match",
            description: "Contribute enough to your 401(k) to get the full employer match - it's free money.",
            category: "saving",
          },
        ],
        investing: [
          {
            title: "Start Early with Compound Interest",
            description: "Time in the market beats timing the market. Start investing as soon as possible.",
            category: "investing",
          },
          {
            title: "Diversify Your Portfolio",
            description: "Spread investments across different asset classes to reduce risk.",
            category: "investing",
          },
          {
            title: "Consider Low-Cost Index Funds",
            description: "Index funds offer broad market exposure with low fees.",
            category: "investing",
          },
          {
            title: "Invest for the Long Term",
            description: "Avoid reacting to short-term market volatility and maintain a long-term perspective.",
            category: "investing",
          },
        ],
        debt: [
          {
            title: "Use the Debt Avalanche Method",
            description: "Pay off debts with the highest interest rates first while making minimum payments on others.",
            category: "debt",
          },
          {
            title: "Consider Debt Consolidation",
            description: "Combine multiple debts into one loan with a lower interest rate if possible.",
            category: "debt",
          },
          {
            title: "Negotiate with Creditors",
            description: "Contact creditors to negotiate lower interest rates or payment plans.",
            category: "debt",
          },
          {
            title: "Avoid New Debt While Paying Off Old",
            description: "Focus on reducing existing debt before taking on new obligations.",
            category: "debt",
          },
        ],
        credit: [
          {
            title: "Pay Your Bills On Time",
            description: "Payment history is the biggest factor in your credit score (35%).",
            category: "credit",
          },
          {
            title: "Keep Credit Utilization Below 30%",
            description: "Use less than 30% of your available credit limit on each card.",
            category: "credit",
          },
          {
            title: "Don't Close Old Credit Cards",
            description: "Length of credit history matters. Keep old accounts open even if unused.",
            category: "credit",
          },
          {
            title: "Monitor Your Credit Report",
            description: "Check your credit report annually for errors and signs of identity theft.",
            category: "credit",
          },
        ],
        general: [
          {
            title: "Live Below Your Means",
            description: "Spend less than you earn and invest the difference for long-term wealth building.",
            category: "general",
          },
          {
            title: "Educate Yourself Continuously",
            description: "Read books, listen to podcasts, and learn about personal finance regularly.",
            category: "general",
          },
          {
            title: "Set Clear Financial Goals",
            description: "Define specific, measurable financial goals with deadlines.",
            category: "general",
          },
          {
            title: "Protect Your Assets with Insurance",
            description: "Ensure you have adequate health, life, disability, and property insurance.",
            category: "general",
          },
        ],
      };

      const tips = tipsByTopic[topic] || tipsByTopic.general;

      const output = {
        topic,
        tips,
        resources: [
          "https://www.consumerfinance.gov/",
          "https://www.investor.gov/",
          "https://www.fdic.gov/resources/consumers/",
        ],
      };

      return createSuccessResponse(
        `Here are ${tips.length} financial tips for ${topic}:\n\n${tips.map((tip, i) => `${i + 1}. **${tip.title}**: ${tip.description}`).join("\n\n")}`,
        output
      );
    }
  );

  // Calculate Budget (50/30/20 Rule)
  server.registerTool(
    "calculate_budget",
    {
      title: "Calculate Budget",
      description: "Calculate recommended budget allocations using the 50/30/20 rule. No authentication required.",
      inputSchema: {
        monthlyIncome: z.number().positive().describe("Monthly after-tax income in dollars"),
        hasDebts: z.boolean().optional().describe("Whether you have high-interest debts to pay off"),
      },
      outputSchema: {
        monthlyIncome: z.number(),
        needs: z.object({ amount: z.number(), percentage: z.number() }),
        wants: z.object({ amount: z.number(), percentage: z.number() }),
        savings: z.object({ amount: z.number(), percentage: z.number() }),
        debtPayment: z.object({ amount: z.number(), percentage: z.number() }).optional(),
        recommendations: z.array(z.string()),
      },
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
      // @ts-expect-error - securitySchemes not yet in MCP SDK types
      securitySchemes: [{ type: "noauth" }],
    },
    async (args: Record<string, unknown>) => {
      const { monthlyIncome, hasDebts = false } = args as { monthlyIncome: number; hasDebts?: boolean };
      // Standard 50/30/20 rule
      let needsPercent = 50;
      let wantsPercent = 30;
      let savingsPercent = 20;
      let debtPercent = 0;

      // If user has debts, recommend aggressive debt payoff
      if (hasDebts) {
        needsPercent = 50;
        wantsPercent = 20;
        savingsPercent = 10;
        debtPercent = 20;
      }

      const needs = (monthlyIncome * needsPercent) / 100;
      const wants = (monthlyIncome * wantsPercent) / 100;
      const savings = (monthlyIncome * savingsPercent) / 100;
      const debt = hasDebts ? (monthlyIncome * debtPercent) / 100 : 0;

      const recommendations = [
        `Allocate $${needs.toFixed(2)} (${needsPercent}%) to needs like housing, food, utilities, and transportation.`,
        `Set aside $${wants.toFixed(2)} (${wantsPercent}%) for wants like dining out, entertainment, and hobbies.`,
        `Save $${savings.toFixed(2)} (${savingsPercent}%) for emergency fund and long-term goals.`,
      ];

      if (hasDebts) {
        recommendations.push(`Pay $${debt.toFixed(2)} (${debtPercent}%) toward high-interest debt to become debt-free faster.`);
        recommendations.push("Focus on eliminating high-interest debt before increasing investment contributions.");
      } else {
        recommendations.push("Consider increasing savings rate once you're comfortable with your budget.");
      }

      const output = {
        monthlyIncome,
        needs: { amount: needs, percentage: needsPercent },
        wants: { amount: wants, percentage: wantsPercent },
        savings: { amount: savings, percentage: savingsPercent },
        ...(hasDebts && { debtPayment: { amount: debt, percentage: debtPercent } }),
        recommendations,
      };

      return createSuccessResponse(
        `Budget breakdown for $${monthlyIncome.toFixed(2)}/month:\n\n` +
        `💰 Needs: $${needs.toFixed(2)} (${needsPercent}%)\n` +
        `🎯 Wants: $${wants.toFixed(2)} (${wantsPercent}%)\n` +
        `📈 Savings: $${savings.toFixed(2)} (${savingsPercent}%)\n` +
        (hasDebts ? `💳 Debt Payment: $${debt.toFixed(2)} (${debtPercent}%)\n` : "") +
        `\n${recommendations.join("\n")}`,
        output
      );
    }
  );

})(req);
});

// Wrap handlers with error logging
const wrappedHandler = async (req: Request) => {
  try {
    logOAuthRequest('MCP', req);

    // Check if this is a tools/list request for detailed logging
    const clonedReq = req.clone();
    let isToolsList = false;
    try {
      const body = await clonedReq.text();
      if (body) {
        const parsed = JSON.parse(body);
        isToolsList = parsed.method === 'tools/list';
      }
    } catch  {
      // Ignore parsing errors
    }

    const response = await handler(req);

    console.log('[MCP] Response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
    });

    // Patch tools/list response to add top-level securitySchemes for ChatGPT compatibility
    if (isToolsList && response.ok) {
      const clonedResponse = response.clone();
      try {
        const text = await clonedResponse.text();
        const lines = text.split('\n');
        const patchedLines: string[] = [];
        let wasPatched = false;

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));
            if (data.result?.tools) {
              // Patch each tool to copy _meta.securitySchemes to top level
              for (const tool of data.result.tools) {
                if (tool._meta?.securitySchemes && !tool.securitySchemes) {
                  tool.securitySchemes = tool._meta.securitySchemes;
                  wasPatched = true;
                  console.log(`[MCP] Patched ${tool.name} with securitySchemes:`, tool.securitySchemes);
                }
              }

              // Log the patched result
              console.log('[MCP] tools/list response (after patching):', {
                toolCount: data.result.tools.length,
                wasPatched,
                tools: data.result.tools.map((t: { name: string; securitySchemes?: unknown; _meta?: { securitySchemes?: unknown } }) => ({
                  name: t.name,
                  hasSecuritySchemes: !!t.securitySchemes,
                  hasMetaSecuritySchemes: !!t._meta?.securitySchemes,
                  securitySchemes: t.securitySchemes,
                  metaSecuritySchemes: t._meta?.securitySchemes,
                })),
              });

              // Rebuild the line with patched data
              patchedLines.push('data: ' + JSON.stringify(data));
            } else {
              patchedLines.push(line);
            }
          } else {
            patchedLines.push(line);
          }
        }

        // Return patched response if we made changes
        if (wasPatched) {
          console.log('[MCP] Returning patched tools/list response');
          return new Response(patchedLines.join('\n'), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }
      } catch (e) {
        console.error('[MCP] Failed to patch tools/list response:', e);
      }
    }

    return response;
  } catch (error) {
    logOAuthError('MCP', error, {
      url: req.url,
      method: req.method,
    });

    // Return a proper error response
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
          data: error instanceof Error ? error.message : 'Unknown error',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export { wrappedHandler as GET, wrappedHandler as POST };
