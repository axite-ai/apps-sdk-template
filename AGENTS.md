# Repository Guidelines

This guide helps agents contribute to AskMyMoney's ChatGPT-ready Next.js repo confidently and consistently. Review the resources in `llm_context/`—Apps SDK docs/examples live under `llm_context/appssdk/`, Better Auth plugins live under `llm_context/betterauth/`, and the empty `llm_context/mcp/` folder is reserved for MCP-specific notes you might add—to fully understand how the Apps SDK and MCP integrations work with this project.

## Project Structure & Module Organization
- `app/` holds Next.js routes; `app/mcp/route.ts` exposes MCP tools/resources consumed by ChatGPT and now registers the new `connect_item` tool that powers multi-item linking.
- `app/connect-bank/` hosts the Plaid Link launcher UI plus the server actions (`actions.ts`) that enforce plan limits, duplicate detection, and initial sync triggers before Plaid tokens are exchanged.
- `app/widgets/` contains server actions for widgets. `app/widgets/connect-item/actions.ts` powers both the MCP tool and the `src/components/connect-item` widget with `getConnectItemStatus()` and `deleteItem()`.
- `lib/` centralizes auth, config, services, and shared types; prefer importing from here over duplicating logic.
  - `lib/db/` contains Drizzle ORM setup: `index.ts` exports db instance and pool, `schema.ts` defines all tables (including `plaid_item_status` enum, `plaid_link_sessions`, and the `plaid_item_deletions` audit table used by the deletion service).
  - `lib/services/` now hosts key flows:
    - `plaid-service.ts` integrates Multi-Item Link (user tokens + `plaid_link_sessions` tracking) and exports Plaid API helpers.
    - `user-service.ts` encrypts Plaid tokens and introduces `countUserItems()` for plan enforcement.
    - `duplicate-detection-service.ts` guards against connecting the same institution/account masks twice.
    - `item-deletion-service.ts` enforces one deletion per 30 days and writes to `plaid_item_deletions`.
    - `webhook-service.ts` stores every webhook (no dedupe) and routes ITEM/TRANSACTIONS/AUTH events.
  - `lib/types/` contains TypeScript type definitions:
    - `mcp-responses.ts` - Core MCP response types (MCPContent, MCPToolResponse, OpenAIResponseMetadata)
    - `tool-responses.ts` - Application-specific structured content types (add new widget/tool payloads here first)
  - `lib/utils/` contains utility functions:
    - `mcp-response-helpers.ts` - Type-safe response creation helpers
    - `mcp-auth-helpers.ts` - DRY auth check helper for MCP tools (`requireAuth()`)
    - `plan-limits.ts` - Single source of truth for plan metadata used by tools, widgets, and webhook handlers
    - `auth-responses.ts` - Auth-specific response builders
- `src/components/connect-item/` renders the Connect Item widget. Use inline props from MCP responses when possible, otherwise call the server actions.
- `src/utils/widget-auth-check.tsx` - DRY auth helper for widgets (`checkWidgetAuth()`).
- `widgets/` serves static HTML wrappers for iframe rendering; keep assets self-contained with inline styles only.
- Operational scripts live in `scripts/`; schema pushes happen with `pnpm db:push` during development (see Build commands). Static assets belong in `public/`.
- `docs/TRANSACTION_SYNC.md` documents the Plaid `/transactions/sync` flow, webhook triggers, and how MCP tools consume the cached transaction data—review it before touching Plaid-related services.

## Build, Test, and Development Commands
- `pnpm dev` launches the Turbopack dev server at `http://localhost:3000`.
- `pnpm build` followed by `pnpm start` produces and smoke-tests the production bundle.
- `pnpm lint` runs Next.js ESLint rules; fix warnings before review.
- `pnpm typecheck` (or `pnpm check`) enforces TypeScript contracts prior to CI.
- **Schema syncing (current workflow):** we are in development and typically run `pnpm db:push` to apply schema changes directly rather than maintaining SQL migrations. If you do add a migration via `pnpm db:generate`, coordinate with the team before committing it.
- `pnpm db:migrate` applies pending Drizzle migrations (mainly for CI or when migrations exist).
- `pnpm db:studio` launches Drizzle Studio for visual database management.
- `pnpm db:schema` regenerates `lib/db/schema.ts` from Better Auth config (run after changing auth plugins).

## Coding Style & Naming Conventions
- Favor TypeScript with 2-space indentation; use async/await and typed helpers.
- Components/hooks use `PascalCase` / `camelCase`; route segments stay `kebab-case`.
- Co-locate feature logic under `app/<feature>` directories and share utilities through `lib`.
- For Plaid Link or widget work, reuse the services mentioned above (`UserService.countUserItems`, `DuplicateDetectionService`, `ItemDeletionService`, `plan-limits`) rather than re-implementing logic.
- Run `pnpm lint` to auto-fix formatting and keep Tailwind classes aligned with existing patterns.

### MCP Tool Response Pattern
When creating MCP tool handlers, always use the DRY auth and response helpers:

```typescript
// Import helpers
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/mcp-response-helpers";
import { requireAuth } from "@/lib/utils/mcp-auth-helpers";

// Define structured content type in lib/types/tool-responses.ts first
server.registerTool("tool_name", config, async ({ param }) => {
  try {
    // DRY auth check (handles session → subscription → Plaid)
    const authCheck = await requireAuth(session, "feature name", {
      requireSubscription: true,  // Default: true
      requirePlaid: true,         // Default: true (set false for non-Plaid tools)
      headers: req.headers,       // Required when requirePlaid: true
    });
    if (authCheck) return authCheck;

    // Business logic
    const data = await fetchData(param);

    // Type-safe response
    return createSuccessResponse(
      "Human-readable message",
      { /* structured content matching your defined type */ }
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : "Operation failed"
    );
  }
});
```

**Key principles:**
- Use `requireAuth()` for all auth checks - eliminates boilerplate and ensures consistency
- Never manually construct `{ type: "text", text: "..." }` objects - use `createTextContent()` or response helpers
- Always define structured content types in `lib/types/tool-responses.ts` before implementing tools
- Use literal types (`type: "text"` not `type: string`) - helpers handle this automatically
- Set `requirePlaid: false` for tools that don't need bank connections (e.g., subscription management)

**Widget Auth Pattern:**
In widgets, use `checkWidgetAuth()` for consistent auth state detection:

```typescript
import { checkWidgetAuth } from "@/src/utils/widget-auth-check";

export default function MyWidget() {
  const toolOutput = useWidgetProps<ToolOutput>();

  // DRY auth check - returns <SubscriptionRequired /> or <PlaidRequired /> if needed
  const authComponent = checkWidgetAuth(toolOutput);
  if (authComponent) return authComponent;

  // Render widget content...
}
```

### Widget Architecture Pattern
1. **Widgets are View-Only Components:** Widgets render whatever the MCP tool already returned—they never issue their own fetches or lookups during initial render.
2. **Single Source of Truth:** All state must come from `toolOutput` (structured content) and `toolMetadata` (widget-only data such as polling hints). If the data is missing there, the widget shows a message instead of trying to hydrate itself.
3. **No Server Actions on Mount:** Never call server actions inside `useEffect` (or similar) when `toolOutput` is `null`. The ChatGPT/Claude iframe sandboxes those requests and they fail authentication, which causes the widget to display subscription/Plaid errors even when the account is valid.
4. **Server Actions Only for User Interactions:** Server actions are allowed for button clicks, deletions, or refreshes initiated by the user after initial render because the Apps SDK forwards the session headers for those explicit actions.
5. **Auth Checks:** Always call `checkWidgetAuth(toolOutput)` before rendering anything else so auth/subscription errors returned by the tool short-circuit consistently.
6. **Handle Missing Data Gracefully:** When `toolOutput` is `null` or lacks certain fields, render an informative empty state (e.g., “No accounts yet. Launch Connect Item to add one.”) rather than invoking a server action.

This pattern is critical for every widget; violating it causes hard auth errors inside ChatGPT and Claude iframe contexts where we cannot prompt the user again.

**Connect Item Bug (What Happened):**
- Bug: The Connect Item widget attempted to call the `getConnectItemStatus()` server action on mount whenever `toolOutput` was `null`.
- Problem: Server actions cannot authenticate during iframe boot, so Better Auth rejected the call, we surfaced a subscription modal, and the widget never hydrated despite the user being paid.
- Fix: Remove the mount-time server action call and rely entirely on the MCP tool props; the widget now matches the working `account-balances`, `transactions`, and other widgets that only read from `toolOutput`/`toolMetadata`.

**✅ Correct Pattern (only hydrate from MCP props):**
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

**❌ Incorrect Pattern (mount-time server action call):**
```tsx
useEffect(() => {
  if (!toolOutput) {
    void getConnectItemStatus(); // server action
  }
}, [toolOutput]);
```
The anti-pattern above replicates the original connect-item bug: it fetches outside of an interaction, so Better Auth rejects it in ChatGPT/Claude and users see a false “subscription required” message.

## Multi-Item Link & Account Management Flow
- **Link token creation:** `app/connect-bank/actions.ts` authenticates via Better Auth MCP sessions, enforces subscriptions, calls `UserService.countUserItems()` to include pending/error items, looks up plan limits via `getMaxAccountsForPlan()`, and blocks when users hit their quota (surfacing deletion info from `ItemDeletionService`).
- **Duplicate detection:** before exchanging a public token we call `DuplicateDetectionService.checkForDuplicateItem()` with institution ID + account masks to prevent double connections.
- **Webhook path:** `app/api/plaid/webhook/route.ts` listens for `LINK` webhooks (`ITEM_ADD_RESULT`, `SESSION_FINISHED`) to process each item in Multi-Item Link sessions. Every item exchange re-checks plan limits and stores metadata in `plaid_link_sessions`. Other webhook types are delegated to `WebhookService`, which intentionally records every event (no dedupe by type/code).
- **Connect Item MCP tool:** the `connect_item` tool in `app/mcp/route.ts` feeds data from `getConnectItemStatus()` into the Connect Item widget (`src/components/connect-item`). Responses include `mcpToken` + `baseUrl` so the widget can open `/connect-bank?token=...` popups and refresh after success messages.
- **Deletions:** `ItemDeletionService.deleteItemWithRateLimit()` enforces one deletion per 30 days, soft-deletes items (`status: 'deleted'` + `deleted_at`), calls Plaid `/item/remove`, and logs to `plaid_item_deletions`. Widgets should handle rate-limit errors by showing `deletionStatus.daysUntilNext`.

## Testing Guidelines

### Automated Testing
The project uses **Vitest** for automated testing with a dedicated test environment:

**Running Tests:**
```bash
pnpm test              # Run all tests
pnpm test:integration  # Run integration tests only
pnpm test:watch        # Run tests in watch mode
pnpm test:coverage     # Generate coverage report
```

**Test Environment:**
- Test config in `vitest.config.ts` uses Vitest's [`test.env`](https://vitest.dev/config/#test-env) option plus a `testEnvDefaults` map to provide deterministic dummy values for Plaid, Stripe, and encryption secrets—real env vars still override them when set.
- Dedicated test database (`askmymoney_test`) created/dropped automatically via `tests/global-setup.ts`
- Uses Drizzle ORM consistently (import `testDb` from `tests/test-db.ts`)
- Integration tests in `tests/integration/`, mocks in `tests/mocks/`

**Writing Tests:**
```typescript
import { testDb } from '../test-db';
import { eq } from 'drizzle-orm';
import { users } from '@/lib/db/schema';

it('should create and query user', async () => {
  await testDb.insert(users).values({ /* ... */ });
  const result = await testDb.query.users.findFirst({ where: eq(users.id, 'user_123') });
  expect(result).toBeDefined();
});
```

**Current Test Status:**
- ✅ 121 tests passing
- ✅ All tests passing. The `should sync transactions for an item` test has been implemented.
- 📚 See `docs/TESTING.md` for comprehensive guide

**Testing TODOs:**
- 📋 Refactor skipped test to use real test database or implement dependency injection for `syncTransactionsForItem`
- 📋 Add unit tests for individual service methods (encryption, user service, subscription helpers)
- 📋 Add E2E tests for complete MCP tool flows (auth → subscription → Plaid → tool execution)
- 📋 Add widget rendering tests (consider using Playwright or Puppeteer)
- 📋 Improve test database isolation using transactions for faster test execution
- 📋 Add tests for error handling and edge cases in MCP tools

**Pre-Commit Checklist:**
- Run `pnpm test` to ensure all tests pass
- Run `pnpm lint` to fix formatting
- Run `pnpm typecheck` to verify types
- Add tests for new features or bug fixes

### Manual Testing
- Capture manual verification notes for MCP endpoints (`/mcp`) and subscription flows in PR description
- For database or auth changes, run `pnpm db:generate` then `pnpm db:migrate` against test database and confirm schema diffs
- When modifying Better Auth config or adding plugins, run `pnpm db:schema` to regenerate the schema file

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat(subscription): hook up stripe subscriptions`) as seen in the Git history.
- Keep commits focused and rebased; avoid merge commits in feature branches.
- PRs need a summary, tests run, environment/migration notes (mention if you used `pnpm db:push`), and UI screenshots when surfaces change (widgets, connect-bank, etc.).
- Link issues or tickets and request reviews early so security-sensitive updates receive double approval.

## Environment & Configuration
- Copy `.env.example` to `.env.local` and populate Plaid, Stripe, Redis, Better Auth, and database secrets.
- For test runs, you usually don't need to export Plaid/Stripe secrets thanks to `testEnvDefaults` (see `vitest.config.ts`), but real credentials will override those dummy values when present.
- `baseUrl.ts` sets Vercel-aware asset prefixes; do not hardcode origins in components.
- Store secrets through Vercel environment variables; never commit `.env` files.
- Utility scripts (`scripts/clear-local-dbs.ts`, `scripts/clear-production-dbs.sh`) are destructive—double-check targets before running.
