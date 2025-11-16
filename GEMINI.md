# Project Overview

This is a Next.js application that integrates with the ChatGPT Apps SDK to provide financial analysis tools within the ChatGPT interface. The application uses the Model Context Protocol (MCP) to expose tools and render widgets in ChatGPT. Review `llm_context/appssdk/APPS_SDK_DOCS.txt` for the official Apps SDK documentation and `llm_context/appssdk/APPS_SDK_EXAMPLES_REPO.txt` for a gallery of working examples; check `llm_context/betterauth/` for the Better Auth plugin docs and use the empty `llm_context/mcp/` folder for any future MCP references so you understand end-to-end behavior.

## Key Technologies

*   **Framework:** Next.js
*   **Language:** TypeScript
*   **Authentication:** Better Auth (OAuth 2.1 with MCP plugin for ChatGPT/Claude)
*   **Financial Data:** Plaid
*   **Subscription/Payments:** Stripe (with Better Auth Stripe plugin)
*   **Database:** PostgreSQL with Drizzle ORM
*   **Caching/Rate Limiting:** Redis
*   **Styling:** Tailwind CSS

## Architecture

The application is structured as a standard Next.js project with the following key components:

*   **Type System for MCP Responses:** A comprehensive type-safe system ensures all MCP tool responses follow the OpenAI Apps SDK specification:
    *   `lib/types/mcp-responses.ts` - Base MCP types (MCPContent, MCPToolResponse, OpenAIResponseMetadata)
    *   `lib/types/tool-responses.ts` - Application-specific structured content types
    *   `lib/utils/mcp-response-helpers.ts` - Helper functions (`createSuccessResponse`, `createErrorResponse`, etc.)
    *   All helpers ensure correct literal types (`type: "text"` not `type: string`) for MCP SDK compatibility
*   **`app/mcp/route.ts`:** The core MCP server that registers and exposes tools to ChatGPT. It handles requests for financial data, such as account balances, transactions, and spending insights. Tools use the `requireAuth()` helper for OAuth authentication, subscription checks, and Plaid connection verification. All tool handlers use type-safe response helpers.
*   **`lib/services/`:** Service layer for business logic:
    *   `plaid-service.ts` - Plaid API interactions (balances, transactions, insights)
    *   `user-service.ts` - User-to-Plaid item mappings with encrypted access tokens
    *   `encryption-service.ts` - AES-256-GCM encryption for sensitive data
*   **`lib/auth/index.ts`:** Better Auth configuration with MCP plugin (OAuth 2.1 for ChatGPT/Claude) and Stripe plugin (subscription management)
*   **`lib/db/`:** Drizzle ORM database layer:
    *   `index.ts` - Database instance and connection pool exports
    *   `schema.ts` - Type-safe schema definitions (Better Auth tables + custom Plaid tables)
*   **`lib/utils/`:** Shared utilities:
    *   `subscription-helpers.ts` - Subscription validation
    *   `mcp-auth-helpers.ts` - DRY auth helper for MCP tools (`requireAuth()`)
    *   `auth-responses.ts` - Auth response builders (login, subscription, Plaid required)
*   **`src/utils/widget-auth-check.tsx`:** DRY auth helper for widgets (`checkWidgetAuth()`)
*   **`widgets/*.html`:** Static HTML widgets rendered in ChatGPT interface (self-contained with inline styles)
*   **`middleware.ts`:** CORS handling for cross-origin RSC requests in ChatGPT iframe
*   **`app/layout.tsx`:** Root layout with `NextChatSDKBootstrap` for browser API patches (history, fetch, HTML attributes)
*   **Deep dive docs:** `docs/TRANSACTION_SYNC.md` covers the Plaid `/transactions/sync` approach (webhooks, cursors, MCP integration) and should be reviewed before changing anything transaction-related.

# Building and Running

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

This will start the development server on `http://localhost:3000`.

## Building for Production

```bash
pnpm build
```

## Running in Production

```bash
pnpm start
```

## Database Operations

The project uses Drizzle ORM for type-safe database operations.

```bash
pnpm db:generate   # Generate migration files from schema changes
pnpm db:migrate    # Apply pending migrations to database
pnpm db:push       # Push schema directly (dev only, skips migrations)
pnpm db:studio     # Launch Drizzle Studio visual database GUI
pnpm db:schema     # Regenerate schema from Better Auth config
```

## Testing

### Automated Testing

The project uses **Vitest** for automated testing with a comprehensive test setup:

```bash
pnpm test              # Run all tests
pnpm test:integration  # Run integration tests only
pnpm test:watch        # Run tests in watch mode
pnpm test:coverage     # Generate coverage report
pnpm typecheck         # Type checking only
```

**Test Environment Configuration:**
- Test config: `vitest.config.ts` injects deterministic dummy secrets via Vitest's [`test.env`](https://vitest.dev/config/#test-env) and `testEnvDefaults`; any real env vars you set will override them.
- Test database: `askmymoney_test` (created/migrated/dropped automatically)
- Database operations: Uses Drizzle ORM (consistent with app code)

**Test File Structure:**
- `tests/global-setup.ts` - Global setup/teardown (database creation, migrations)
- `tests/setup-files.ts` - Per-test-file setup (imports, console filtering)
- `tests/test-db.ts` - Test database utilities (`testDb`, `testPool`, `closeTestDb()`)
- `tests/integration/` - Integration tests with real database
- `tests/mocks/` - Mock data for Plaid, Stripe, database

**Writing Tests:**
```typescript
import { testDb } from '../test-db';
import { eq } from 'drizzle-orm';
import { users } from '@/lib/db/schema';

describe('User Service', () => {
  it('should create user', async () => {
    await testDb.insert(users).values({
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    });

    const user = await testDb.query.users.findFirst({
      where: eq(users.id, 'user_123')
    });

    expect(user).toBeDefined();
    expect(user?.email).toBe('test@example.com');
  });
});
```

**Current Test Status:**
- ✅ 121 tests passing
- ⚠️ 1 test skipped: `should sync transactions for an item` (needs refactoring)
- 📖 See `docs/TESTING.md` for comprehensive guide

**Testing TODOs:**
- 📋 Refactor skipped test: Modify `syncTransactionsForItem` to accept db instance or use real test database
- 📋 Add unit tests for services (encryption, user service, subscription validation)
- 📋 Add E2E tests for MCP tool flows (OAuth → subscription → Plaid → tool execution)
- 📋 Add widget rendering tests (HTML/CSS validation, interactive behavior)
- 📋 Improve test isolation with database transactions
- 📋 Add comprehensive error handling tests for MCP tools

**Pre-Commit Checklist:**
- Run `pnpm test` to ensure tests pass
- Run `pnpm typecheck` to verify TypeScript
- Run `pnpm lint` to fix formatting issues

## Database Schema Notes

- Schema is defined in `lib/db/schema.ts` using Drizzle ORM
- Database columns use **snake_case** (e.g., `stripe_customer_id`, `reference_id`)
- TypeScript properties use **camelCase** (e.g., `stripeCustomerId`, `referenceId`)
- When writing raw SQL queries, always use snake_case column names
- Migrations are stored in `drizzle/` directory

# Development Conventions

*   **Package Manager:** The project uses `pnpm` as the package manager.
*   **Coding Style:** The project follows standard TypeScript and React conventions.
*   **Linting:** The project uses Next.js's built-in ESLint configuration.
*   **Commits:** Commit messages should follow the Conventional Commits specification.

## Adding New MCP Tools

When creating new MCP tools, follow this pattern for type safety:

1. **Define structured content type** in `lib/types/tool-responses.ts`:
   ```typescript
   export interface YourFeatureContent {
     data: string[];
     count: number;
   }

   export type YourFeatureResponse = MCPToolResponse<
     YourFeatureContent,
     OpenAIResponseMetadata
   >;
   ```

2. **Use auth and response helpers** in tool handlers:
   ```typescript
   import { createSuccessResponse, createErrorResponse } from "@/lib/utils/mcp-response-helpers";
   import { requireAuth } from "@/lib/utils/mcp-auth-helpers";

   server.registerTool("tool_name", config, async ({ param }) => {
     try {
       // DRY auth check
       const authCheck = await requireAuth(session, "feature name", {
         requireSubscription: true,
         requirePlaid: true,
         headers: req.headers,
       });
       if (authCheck) return authCheck;

       // Business logic
       const result = await fetchData(param);
       return createSuccessResponse(
         "Success message",
         { data: result.data, count: result.count }
       );
     } catch (error) {
       return createErrorResponse(
         error instanceof Error ? error.message : "Failed"
       );
     }
   });
   ```

3. **Available helpers:**

   **MCP Response Helpers** (`lib/utils/mcp-response-helpers.ts`):
   - `createSuccessResponse(text, structuredContent, meta?)` - Standard responses
   - `createErrorResponse(message, meta?)` - Error responses

   **Auth Response Helpers** (`lib/utils/auth-responses.ts`):
   - `createSubscriptionRequiredResponse(featureName, userId)` - Subscription required
   - `createPlaidRequiredResponse(userId, headers)` - Plaid connection required
   - `createLoginPromptResponse(featureName?)` - Authentication required

   **Auth Check Helper** (`lib/utils/mcp-auth-helpers.ts`):
   - `requireAuth(session, featureName, options)` - DRY three-tier auth (session → subscription → Plaid)

   **Widget Auth Helper** (`src/utils/widget-auth-check.tsx`):
   - `checkWidgetAuth(toolOutput)` - DRY widget auth state detection

All helpers ensure proper literal types and MCP SDK compatibility.

**Auth Helper Options:**
```typescript
await requireAuth(session, "feature name", {
  requireSubscription: true,  // Default: true
  requirePlaid: true,         // Default: true (set false for non-Plaid tools)
  headers: req.headers,       // Required when requirePlaid: true
});
```

## Important: Creating Stripe Checkout Sessions

When creating Stripe checkout sessions (in server actions or MCP tools), you MUST follow the Better Auth Stripe plugin's expected flow:

**Critical Requirements:**

1. **Pre-create a database subscription record** with status `"incomplete"` BEFORE creating the Stripe checkout session
2. **Pass the database subscription ID** as `subscriptionId` in checkout metadata
3. **Include `client_reference_id`** and both `referenceId` fields

**Example:**

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
  client_reference_id: userId, // CRITICAL
  metadata: {
    referenceId: userId,
    subscriptionId: subscription.id, // CRITICAL - Database ID, not Stripe ID
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

**Why This Matters:** Better Auth's webhook handler requires BOTH `referenceId` AND `subscriptionId` to persist subscriptions. Without `subscriptionId`, webhooks will silently fail and subscriptions won't be saved to the database (even though they exist in Stripe). See `app/widgets/subscription-required/actions.ts` for the correct implementation.
