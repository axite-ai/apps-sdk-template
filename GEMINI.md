# Project Overview

This is a Next.js application that integrates with the ChatGPT Apps SDK to provide financial analysis tools within the ChatGPT interface. The application uses the Model Context Protocol (MCP) to expose tools and render widgets in ChatGPT. Review `llm_context/appssdk/APPS_SDK_DOCS.txt` for the official Apps SDK documentation and `llm_context/appssdk/APPS_SDK_EXAMPLES_REPO.txt` for a gallery of working examples; check `llm_context/betterauth/` for the Better Auth plugin docs and use the empty `llm_context/mcp/` folder for any future MCP references so you understand end-to-end behavior. Recent updates added Plaid Multi-Item Link support, the Connect Item tool/widget for account management, webhook-driven plan enforcement, and an audit trail for deletions.

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
*   **`app/mcp/route.ts`:** The core MCP server that registers and exposes tools to ChatGPT. It handles requests for financial data (balances, transactions, insights, account health) and now includes the `connect_item` tool (account linking/deletion) plus `manage_subscription` (Stripe billing portal). Tools use the `requireAuth()` helper for OAuth authentication, subscription checks, and Plaid connection verification (set `requirePlaid: false` for flows like `connect_item` that bootstrap Plaid). All tool handlers use type-safe response helpers.
*   **`lib/services/`:** Service layer for business logic:
    *   `plaid-service.ts` - Plaid API interactions (balances, transactions, insights) plus Multi-Item Link helpers (`getOrCreatePlaidUserToken`, `createLinkToken`, `plaid_link_sessions` tracking)
    *   `user-service.ts` - User-to-Plaid item mappings with encrypted access tokens and plan-aware helpers (`countUserItems`)
    *   `duplicate-detection-service.ts` - Checks institution + account masks before exchanges to prevent duplicates
    *   `item-deletion-service.ts` - Enforces one deletion per 30 days, calls Plaid `/item/remove`, sets `status: 'deleted'`, and logs to `plaid_item_deletions`
    *   `webhook-service.ts` - Persists every webhook payload (no dedupe) and routes ITEM/TRANSACTIONS/AUTH events
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
*   **Connect Item widget:** `app/widgets/connect-item/actions.ts` exposes `getConnectItemStatus()` + `deleteItem()` (used by the MCP tool and widget) while `src/components/connect-item/` renders the UI, opens `/connect-bank?token=...` popups, listens for success `postMessage` events, and respects deletion cooldowns.
*   **`widgets/*.html`:** Static HTML widgets rendered in ChatGPT interface (self-contained with inline styles)
*   **`app/connect-bank/actions.ts`:** Server actions for creating Link tokens and exchanging public tokens. They authenticate via Better Auth MCP tokens, enforce subscriptions, call `UserService.countUserItems()` + `getMaxAccountsForPlan()`, run `DuplicateDetectionService`, surface deletion cooldown info from `ItemDeletionService`, and trigger initial `/transactions/sync`.
*   **`middleware.ts`:** CORS handling for cross-origin RSC requests in ChatGPT iframe
*   **`app/layout.tsx`:** Root layout with `NextChatSDKBootstrap` for browser API patches (history, fetch, HTML attributes)
*   **Deep dive docs:** `docs/TRANSACTION_SYNC.md` covers the Plaid `/transactions/sync` approach (webhooks, cursors, MCP integration) and should be reviewed before changing anything transaction-related.

# Multi-Item Link & Account Management

*   **Link token creation (`app/connect-bank/actions.ts`):** Requires an MCP session + subscription, counts items with `UserService.countUserItems()` (pending/error included), uses `getMaxAccountsForPlan()` to block once limits are reached, runs `DuplicateDetectionService.checkForDuplicateItem()` before exchanging tokens, surfaces deletion cooldown info from `ItemDeletionService.getDeletionInfo()`, and calls `/transactions/sync` immediately after connecting.
*   **Webhook path (`app/api/plaid/webhook/route.ts`):** Handles Plaid `LINK` webhooks (`ITEM_ADD_RESULT`, `SESSION_FINISHED`) emitted by Multi-Item Link. Every incoming public token re-checks the user’s plan limits before calling `UserService.savePlaidItem()` and updates the `plaid_link_sessions` row. Other webhook types (ITEM, TRANSACTIONS, AUTH) are forwarded to `WebhookService`, which intentionally records every event without deduping type/code pairs.
*   **Connect Item tool/widget:** The `connect_item` MCP tool bundles `ConnectItemResponse` data from `getConnectItemStatus()` and includes metadata (`ui://widget/connect-item.html`, `mcpToken`, `baseUrl`). The widget shows all items, highlights statuses (`pending`, `error`, etc.), opens `/connect-bank?token=...` popups when users click Connect, listens for `plaid-success` messages, and calls `deleteItem()` (which enforces deletion rate limits via `ItemDeletionService`).
*   **Deletion workflow:** `ItemDeletionService.deleteItemWithRateLimit()` decrypts the access token, calls Plaid `/item/remove`, marks the row as `status: 'deleted'` with `deleted_at`, and inserts an audit record in `plaid_item_deletions`. The widget displays `deletionStatus.daysUntilNext` so users know when they can remove another item.

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
pnpm db:push       # Current workflow: push schema directly in development
pnpm db:generate   # Optional - generate migration files (coordinate before committing)
pnpm db:migrate    # Apply pending migrations (mainly for CI or shared databases)
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
- Custom tables to know about:
  - `plaid_items` (includes `status`, `error_*`, `deleted_at`)
  - `plaid_accounts`, `plaid_transactions`, `plaid_webhooks`
  - `plaid_link_sessions` (Multi-Item Link session log w/ user tokens)
  - `plaid_item_deletions` (audit + rate limit source)

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

## Widget Architecture Pattern

1. **Widgets are View-Only Components:** Widgets render the structured content already provided by MCP tools—they do not fetch new data on mount or try to “rehydrate” themselves.
2. **Single Source of Truth:** Treat `toolOutput` (structured content) and `toolMetadata` (widget-only hints) as the only data sources. If a field is missing there, show an explanatory message instead of making a new request.
3. **No Server Actions on Mount:** Never call server actions inside `useEffect` (or similar) when `toolOutput` is `null`. ChatGPT/Claude iframes block those unauthenticated calls, producing false subscription/Plaid errors.
4. **Server Actions Only for User Interactions:** Server actions are safe when triggered by button clicks or other explicit user events—the Apps SDK forwards session headers for those interactions.
5. **Auth Checks:** Call `checkWidgetAuth(toolOutput)` before rendering so auth/subscription errors returned by the tool are handled consistently.
6. **Handle Missing Data Gracefully:** Show empty states (“No accounts yet”) when data is absent rather than attempting to call server actions.

This contract is critical for every widget; breaking it leads to systematic auth failures in ChatGPT/Claude iframe contexts.

**Connect Item Bug → Fix:**
- **Bug:** `src/components/connect-item` invoked the `getConnectItemStatus()` server action on mount whenever `toolOutput` was `null`.
- **Problem:** Better Auth cannot authenticate server actions that fire during iframe boot, so the widget surfaced subscription modals even for paid users.
- **Fix/Pattern:** Remove the mount-time server action call and hydrate purely from MCP tool props, just like the `account-balances` and `transactions` widgets.

**✅ Correct pattern (hydrate only from MCP props):**
```tsx
import { useWidgetProps, useWidgetMetadata } from "@openai/widget-sdk";
import { deleteItem } from "@/app/widgets/connect-item/actions";
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";
import type { ConnectItemStatusResponse } from "@/lib/types/tool-responses";

export default function ConnectItemWidget() {
  const toolOutput = useWidgetProps<ConnectItemStatusResponse>();
  const toolMetadata = useWidgetMetadata<{ baseUrl?: string }>();

  const authComponent = checkWidgetAuth(toolOutput);
  if (authComponent) return authComponent;

  if (!toolOutput?.structuredContent) {
    return <EmptyState message="No accounts yet. Launch Connect Item to add one." />;
  }

  const { items, deletionStatus } = toolOutput.structuredContent;

  return (
    <ConnectItemList
      items={items}
      deletionStatus={toolMetadata?.deletionStatusOverride ?? deletionStatus}
      onDelete={async (itemId) => {
        await deleteItem(itemId); // user-triggered server action
      }}
    />
  );
}
```

**❌ Incorrect anti-pattern (server action on mount):**
```tsx
useEffect(() => {
  if (!toolOutput) {
    void getConnectItemStatus(); // server action
  }
}, [toolOutput]);
```
The anti-pattern reproduces the original bug: it fires a server action while the iframe is still authenticating, so the call fails and the widget displays false auth errors.

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

**Why This Matters:** Better Auth's webhook handler requires BOTH `referenceId` AND `subscriptionId` to persist subscriptions. Without `subscriptionId`, webhooks will silently fail and subscriptions won't be saved to the database (even though they exist in Stripe). See `app/widgets/subscription-required/actions.ts` for the correct implementation. The `manage_subscription` MCP tool already follows these requirements and instantiates the Stripe SDK with the preview version `2025-10-29.clover`; leave that version untouched unless maintainers explicitly request a change.
