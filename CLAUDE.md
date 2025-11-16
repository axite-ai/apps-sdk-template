# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. For a deeper understanding of how the OpenAI Apps SDK behaves in ChatGPT, reference `llm_context/appssdk/APPS_SDK_DOCS.txt` (docs) and `llm_context/appssdk/APPS_SDK_EXAMPLES_REPO.txt` (working examples); related Better Auth references live under `llm_context/betterauth/` (for example `BETTER_AUTH_MCP_PLUGIN_DOCS.txt`).

## Project Overview

AskMyMoney is a financial management application built as a ChatGPT MCP (Model Context Protocol) server using Next.js. It integrates with Plaid for bank account data, Better Auth for OAuth 2.1 authentication, and Stripe for subscription management. The app exposes financial tools through MCP that can be invoked from ChatGPT, with responses rendered as interactive widgets in ChatGPT's interface.

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server (with Turbopack)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Type checking
pnpm typecheck           # One-time check
pnpm typecheck:watch     # Watch mode

# Combined check (typecheck + build)
pnpm check

# Linting
pnpm lint

# Database operations
pnpm db:generate      # Generate Drizzle migrations from schema
pnpm db:migrate       # Apply pending migrations
pnpm db:push         # Push schema without migrations (dev only)
pnpm db:studio       # Launch Drizzle Studio GUI
pnpm db:schema       # Regenerate schema from Better Auth config
```

## Architecture

### Type System for MCP Responses

The project uses a comprehensive, type-safe system for MCP tool responses based on the OpenAI Apps SDK specification:

**Core Type Files:**
- `lib/types/mcp-responses.ts` - Base MCP types (`MCPContent`, `MCPToolResponse`, `OpenAIResponseMetadata`)
- `lib/types/tool-responses.ts` - Application-specific structured content types
- `lib/utils/mcp-response-helpers.ts` - Helper functions for creating responses

**Key Features:**
- Type-safe content creation with literal types (`type: "text"` not `type: string`)
- Proper OpenAI metadata typing for widget configuration
- Helper functions that eliminate boilerplate:
  - `createSuccessResponse(text, structuredContent, meta?)` - Standard success responses
  - `createErrorResponse(message, meta?)` - Error responses
  - `createTextContent(text, meta?)` - Individual text content items

**Example Usage in MCP Tools:**
```typescript
// Import helpers and types
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/mcp-response-helpers";
import type { AccountBalancesResponse } from "@/lib/types/tool-responses";

// In your tool handler
server.registerTool("get_account_balances", config, async () => {
  try {
    const data = await fetchAccountData();

    // Type-safe success response
    return createSuccessResponse(
      `Found ${data.accounts.length} accounts`,
      {
        accounts: data.accounts,
        totalBalance: data.total,
        lastUpdated: new Date().toISOString()
      }
    );
  } catch (error) {
    // Type-safe error response
    return createErrorResponse(
      error instanceof Error ? error.message : "Failed to fetch balances"
    );
  }
});
```

All tool responses automatically include proper `content` arrays with correctly typed content items, making them compatible with the MCP SDK while maintaining type safety.

### MCP Server (`app/mcp/route.ts`)

The core of the application. Registers financial tools that ChatGPT can invoke:

**Authenticated Tools (require OAuth + subscription + Plaid connection):**
- `get_account_balances` - Fetch account balances from all linked accounts
- `get_transactions` - Retrieve recent transactions with date filtering (now syncs from local DB)
- `get_spending_insights` - Analyze spending by category
- `check_account_health` - Check for low balances, overdrafts, high credit utilization

**Free Tools (no authentication required):**
- `get_financial_tips` - Educational financial advice by topic
- `calculate_budget` - 50/30/20 budget calculator

All authenticated tools use the `requireAuth()` helper which implements a three-tier authorization pattern:
1. Check if user is logged in (OAuth session)
2. Check if user has active subscription (via `hasActiveSubscription()`)
3. Check if user has linked Plaid accounts (via `UserService.getUserAccessTokens()`)

The `requireAuth()` helper from `lib/utils/mcp-auth-helpers.ts` provides a DRY way to implement these checks consistently across all tools.

Tools return structured responses with OpenAI-specific metadata for widget rendering.

### Authentication (`lib/auth/index.ts`)

Uses Better Auth with two plugins:
- **MCP plugin**: Provides OAuth 2.1 flows for ChatGPT/Claude integration with trusted clients (`chatgpt.com`, `claude.ai`)
- **Stripe plugin**: Manages subscriptions (basic/pro/enterprise plans) with trial support

Session data stored in PostgreSQL. Rate limiting and caching use Redis as secondary storage.

### Data Layer

**Services:**
- `lib/services/plaid-service.ts` - All Plaid API interactions (balances, transactions sync, insights, health checks)
- `lib/services/user-service.ts` - Manages user-to-Plaid item mappings, encrypts/decrypts access tokens
- `lib/services/encryption-service.ts` - AES-256-GCM encryption for Plaid tokens at rest
- `lib/utils/subscription-helpers.ts` - Subscription status validation

**Database:**
- PostgreSQL for user data, sessions, Plaid items, subscriptions
- Redis for rate limiting and caching
- Drizzle ORM for type-safe database operations
- Schema defined in `lib/db/schema.ts`
- Migrations managed via Drizzle Kit in `drizzle/` directory

### ChatGPT Widget Integration

**Critical Configuration:**

1. **Asset Prefix** (`next.config.ts`): Set to `baseURL` to prevent 404s on `/_next/` assets when rendered in ChatGPT iframes

2. **CORS Middleware** (`middleware.ts`): Handles OPTIONS preflight requests for cross-origin RSC fetching during client-side navigation

3. **SDK Bootstrap** (`app/layout.tsx`): `<NextChatSDKBootstrap>` patches browser APIs to work in ChatGPT iframes:
   - `history.pushState/replaceState` - Prevents full-origin URLs
   - `window.fetch` - Rewrites same-origin requests to correct base URL
   - `<html>` attribute observer - Prevents ChatGPT from modifying root element

4. **Widget Resources**: Tools link to widgets via `templateUri` in OpenAI metadata (e.g., `"ui://widget/account-balances.html"`)

### Environment Variables

Required variables (see `.env.example`):
- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` - Plaid API credentials
- `POSTGRES_*` - PostgreSQL connection (host, port, database, user, password, ssl)
- `REDIS_URL` - Redis connection string
- `BETTER_AUTH_SECRET` - Session signing secret (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL` - Base URL for OAuth redirects
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Stripe API keys
- `STRIPE_*_PRICE_ID` - Price IDs for basic/pro/enterprise plans
- `ENCRYPTION_KEY` - 32-byte hex key for encrypting Plaid tokens (generate with `openssl rand -hex 32`)

Auto-detected in Vercel: `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`

## Working with MCP Tools

When adding new tools to `app/mcp/route.ts`:

### 1. Define Structured Content Type

First, add your tool's structured content type to `lib/types/tool-responses.ts`:

```typescript
// Define the shape of data your tool returns
export interface YourFeatureContent {
  data: string[];
  count: number;
  timestamp: string;
}

// Create a response type alias for convenience
export type YourFeatureResponse = MCPToolResponse<
  YourFeatureContent,
  OpenAIResponseMetadata
>;
```

### 2. Register the Tool

```typescript
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/mcp-response-helpers";
import { requireAuth } from "@/lib/utils/mcp-auth-helpers";

server.registerTool(
  "your_tool_name",
  {
    title: "Your Tool Title",
    description: "What this tool does",
    inputSchema: {
      param1: z.string().describe("First parameter"),
      param2: z.number().optional().describe("Optional parameter"),
    },
    _meta: {
      "openai/outputTemplate": "ui://widget/your-widget.html",
      "openai/toolInvocation/invoking": "Loading...",
      "openai/toolInvocation/invoked": "Complete!",
      "openai/widgetAccessible": false,
    },
    annotations: {
      readOnlyHint: true,  // or false if it modifies data
      destructiveHint: false,
      openWorldHint: false,
    },
    securitySchemes: [{ type: "oauth2", scopes: ["feature:read"] }],
  },
  async ({ param1, param2 }) => {
    try {
      // Auth checks using DRY helper
      const authCheck = await requireAuth(session, "your feature", {
        requireSubscription: true,
        requirePlaid: true,
        headers: req.headers,
      });
      if (authCheck) return authCheck;

      // Business logic
      const result = await yourBusinessLogic(param1, param2);

      // Type-safe response using helper
      return createSuccessResponse(
        `Processed ${result.count} items`,
        {
          data: result.data,
          count: result.count,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : "Operation failed"
      );
    }
  }
);
```

### 3. Response Helper Reference

**MCP Response Helpers** (`lib/utils/mcp-response-helpers.ts`):
- `createSuccessResponse(text, structuredContent, meta?)` - Standard success with data
- `createErrorResponse(message, meta?)` - Error responses

**Auth Response Helpers** (`lib/utils/auth-responses.ts`):
- `createSubscriptionRequiredResponse(featureName, userId)` - Subscription paywall
- `createPlaidRequiredResponse(userId, headers)` - Plaid connection required
- `createLoginPromptResponse(featureName?)` - Login required

**Auth Check Helper** (`lib/utils/mcp-auth-helpers.ts`):
- `requireAuth(session, featureName, options)` - DRY helper for three-tier auth checks

**Individual content helpers:**
- `createTextContent(text, meta?)` - Text content item
- `createImageContent(data, mimeType, meta?)` - Image content item
- `createResourceContent(uri, content, meta?)` - Resource content item

### 4. Auth Pattern (Using DRY Helper)

For tools requiring authentication, use the `requireAuth()` helper:

```typescript
import { requireAuth } from "@/lib/utils/mcp-auth-helpers";

// DRY auth check (handles all three tiers)
const authCheck = await requireAuth(session, "feature name", {
  requireSubscription: true,  // Default: true
  requirePlaid: true,         // Default: true
  headers: req.headers,       // Required for Plaid check
});
if (authCheck) return authCheck;

// If requireAuth returns null, all checks passed
// Continue with business logic...
```

**Options:**
- `requireSubscription` - Set to `false` for tools that don't need subscriptions (e.g., free tier tools)
- `requirePlaid` - Set to `false` for tools that don't need bank connections (e.g., subscription management)
- `headers` - Required when `requirePlaid: true` to extract MCP access token

**What it checks:**
1. OAuth session exists → Returns login prompt if missing
2. Active subscription (if `requireSubscription: true`) → Returns subscription required if missing
3. Plaid connection (if `requirePlaid: true`) → Returns Plaid required if missing

All response helpers ensure:
- Correct literal types (`type: "text"` not `type: string`)
- Proper OpenAI metadata structure
- MCP SDK compatibility
- Type safety throughout

### Creating Stripe Checkout Sessions from MCP Tools or Server Actions

When creating Stripe checkout sessions, you MUST follow the Better Auth Stripe plugin's expected flow. Better Auth's webhooks require THREE critical pieces of metadata to persist subscriptions:

**CRITICAL REQUIREMENTS:**

1. **Pre-create a database subscription record** with status `"incomplete"` BEFORE creating the Stripe checkout session
2. **Pass the database subscription ID** as `subscriptionId` in checkout metadata
3. **Include both `referenceId` fields** in metadata and `client_reference_id`

```typescript
// 1. Pre-create incomplete subscription in database
const ctx = await auth.$context;
const subscription = await ctx.adapter.create({
  model: "subscription",
  data: {
    plan: planName.toLowerCase(),
    stripeCustomerId: stripeCustomerId,
    status: "incomplete",
    referenceId: userId,
    seats: 1,
  },
});

// 2. Create checkout session with REQUIRED metadata
const checkoutSession = await stripe.checkout.sessions.create({
  customer: stripeCustomerId,
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/pricing`,
  client_reference_id: userId, // CRITICAL: Fallback for referenceId lookup
  metadata: {
    referenceId: userId,
    subscriptionId: subscription.id, // CRITICAL: Database subscription ID (NOT Stripe subscription ID)
    plan: planName.toLowerCase(),
  },
  subscription_data: {
    metadata: {
      referenceId: userId,
      plan: planName.toLowerCase(),
    },
  },
});
```

**Why This Is Required:**

Better Auth's webhook handler (`onCheckoutSessionCompleted` in the Stripe plugin) checks:
```typescript
if (referenceId && subscriptionId) {
  // Update subscription...
} else {
  // Silently exits - subscription NOT persisted
}
```

**Required Metadata Fields:**
- `client_reference_id` - User/org ID (fallback for referenceId)
- `metadata.referenceId` - User/org ID that owns the subscription
- `metadata.subscriptionId` - **CRITICAL:** Your internal database subscription.id (created in step 1)
- `metadata.plan` - Plan name matching your Better Auth config
- `subscription_data.metadata.referenceId` - User/org ID for subscription object
- `subscription_data.metadata.plan` - Plan name for subscription object

Without `subscriptionId` in the metadata, webhooks will silently fail and subscriptions won't be persisted to your database, even though they exist in Stripe.

## Database Schema

**Using Drizzle ORM** - Schema defined in `lib/db/schema.ts` with snake_case column names:

**Better Auth Core Tables:**
- `user` - User accounts with OAuth identities and Stripe customer IDs
- `session` - Active user sessions
- `account` - OAuth provider accounts
- `verification` - Email verification tokens

**Better Auth Plugin Tables:**
- `apikey` - API key authentication (from apiKey plugin)
- `jwks` - JSON Web Key Set (from jwt plugin)
- `oauth_application` - OAuth applications (from mcp plugin)
- `oauth_access_token` - OAuth access tokens (from mcp plugin)
- `oauth_consent` - OAuth user consents (from mcp plugin)
- `subscription` - Stripe subscriptions with plan limits (from stripe plugin)

**Custom Application Tables:**
- `plaid_items` - User-to-Plaid account mappings (access tokens encrypted)
- `plaid_accounts` - Stores account-level data from Plaid
- `plaid_transactions` - Stores transaction data synced from Plaid
- `plaid_webhooks` - Plaid webhook event logs
- The Plaid `/transactions/sync` workflow (webhook triggers, cursor handling, MCP tool consumption) lives in `docs/TRANSACTION_SYNC.md`; read it before modifying `plaid-service.ts` or the `get_transactions` tool.

**Important:** Database columns use snake_case (e.g., `stripe_customer_id`, `reference_id`) while TypeScript properties use camelCase. When writing raw SQL queries, always use snake_case column names.

## Path Aliases

TypeScript path alias: `@/*` maps to project root (e.g., `@/lib/auth` → `/lib/auth`)

## Deployment

Designed for Vercel deployment. Base URL auto-detection via `baseUrl.ts` handles:
- Production URLs via `VERCEL_PROJECT_PRODUCTION_URL`
- Preview/branch URLs via `VERCEL_BRANCH_URL`
- Local development fallback to `http://localhost:3000`

## Testing

### Automated Testing

The project uses Vitest for automated testing with a dedicated test environment:

**Test Commands:**
```bash
pnpm test              # Run all tests
pnpm test:integration  # Run integration tests only
pnpm test:watch        # Run tests in watch mode
pnpm test:coverage     # Run tests with coverage report
```

**Test Configuration:**
- Test environment configured in `vitest.config.ts`
- Environment variables are set via Vitest's [`test.env`](https://vitest.dev/config/#test-env) plus a `testEnvDefaults` map (see `vitest.config.ts`) so Plaid/Stripe/encryption tests run with deterministic dummy secrets—any real env var you provide overrides the defaults.
- Dedicated test database (`askmymoney_test`) created/dropped automatically
- Uses Drizzle ORM for database operations in tests (consistent with app code)

**Test Files:**
- `tests/global-setup.ts` - Database creation, migration, and teardown
- `tests/setup-files.ts` - Per-test-file setup (imports, mocks)
- `tests/test-db.ts` - Test database utilities (`testDb`, `testPool`, `closeTestDb()`)
- `tests/integration/` - Integration tests with real database
- `tests/mocks/` - Mock data for Plaid, Stripe, database

**Writing Tests:**
```typescript
import { testDb } from '../test-db';
import { users } from '@/lib/db/schema';

it('should query test database', async () => {
  const result = await testDb.select().from(users);
  expect(result).toBeDefined();
});
```

**Known Limitations & TODOs:**
- ⚠️ One test skipped: `should sync transactions for an item` - needs refactoring to use real test database or dependency injection
- ⚠️ Database permission warnings during teardown (harmless, doesn't affect test results)
- 📋 TODO: Add unit tests for individual services (currently only integration tests exist)
- 📋 TODO: Add E2E tests for MCP tool flows
- 📋 TODO: Add tests for widget rendering
- 📋 TODO: Improve test database isolation (consider using transactions for faster cleanup)

See `docs/TESTING.md` for comprehensive testing guide.

### Manual Testing - MCP Integration

1. Run `pnpm dev` locally
2. MCP server available at `http://localhost:3000/mcp`
3. To connect from ChatGPT:
   - Deploy to Vercel or use ngrok for local testing
   - In ChatGPT Settings → Connectors → Create, add `https://your-domain.com/mcp`
   - Requires ChatGPT developer mode access

## Development Guidelines

- Use server actions over API routes whenever possible
- Use arrow function syntax whenever possible
- Run `pnpm typecheck` before committing
- Run tests with `pnpm test` to ensure no regressions
