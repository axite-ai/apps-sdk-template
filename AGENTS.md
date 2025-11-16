# Repository Guidelines

This guide helps agents contribute to AskMyMoney's ChatGPT-ready Next.js repo confidently and consistently. Review the resources in `llm_context/`—Apps SDK docs/examples live under `llm_context/appssdk/`, Better Auth plugins live under `llm_context/betterauth/`, and the empty `llm_context/mcp/` folder is reserved for MCP-specific notes you might add—to fully understand how the Apps SDK and MCP integrations work with this project.

## Project Structure & Module Organization
- `app/` holds Next.js routes; `app/mcp/route.ts` exposes MCP tools/resources consumed by ChatGPT.
- `lib/` centralizes auth, config, services, and shared types; prefer importing from here over duplicating logic.
  - `lib/db/` contains Drizzle ORM setup: `index.ts` exports db instance and pool, `schema.ts` defines all tables
  - `lib/types/` contains TypeScript type definitions:
    - `mcp-responses.ts` - Core MCP response types (MCPContent, MCPToolResponse, OpenAIResponseMetadata)
    - `tool-responses.ts` - Application-specific structured content types for each tool
  - `lib/utils/` contains utility functions:
    - `mcp-response-helpers.ts` - Type-safe response creation helpers
    - `mcp-auth-helpers.ts` - DRY auth check helper for MCP tools (`requireAuth()`)
    - `auth-responses.ts` - Auth-specific response builders
- `src/utils/widget-auth-check.tsx` - DRY auth helper for widgets (`checkWidgetAuth()`)
- `widgets/` serves static HTML widgets for iframe rendering; keep assets self-contained with inline styles only.
- Operational scripts live in `scripts/`; Drizzle migrations are in `drizzle/`. Static assets belong in `public/`.
- `docs/TRANSACTION_SYNC.md` documents the Plaid `/transactions/sync` flow, webhook triggers, and how MCP tools consume the cached transaction data—review it before touching Plaid-related services.

## Build, Test, and Development Commands
- `pnpm dev` launches the Turbopack dev server at `http://localhost:3000`.
- `pnpm build` followed by `pnpm start` produces and smoke-tests the production bundle.
- `pnpm lint` runs Next.js ESLint rules; fix warnings before review.
- `pnpm typecheck` (or `pnpm check`) enforces TypeScript contracts prior to CI.
- `pnpm db:generate` generates Drizzle migration files from schema changes.
- `pnpm db:migrate` applies pending Drizzle migrations to the database.
- `pnpm db:push` pushes schema directly without migrations (development only).
- `pnpm db:studio` launches Drizzle Studio for visual database management.
- `pnpm db:schema` regenerates `lib/db/schema.ts` from Better Auth config (run after changing auth plugins).

## Coding Style & Naming Conventions
- Favor TypeScript with 2-space indentation; use async/await and typed helpers.
- Components/hooks use `PascalCase` / `camelCase`; route segments stay `kebab-case`.
- Co-locate feature logic under `app/<feature>` directories and share utilities through `lib`.
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
- PRs need a summary, tests run, environment/migration notes, and UI screenshots when surfaces change.
- Link issues or tickets and request reviews early so security-sensitive updates receive double approval.

## Environment & Configuration
- Copy `.env.example` to `.env.local` and populate Plaid, Stripe, Redis, Better Auth, and database secrets.
- For test runs, you usually don't need to export Plaid/Stripe secrets thanks to `testEnvDefaults` (see `vitest.config.ts`), but real credentials will override those dummy values when present.
- `baseUrl.ts` sets Vercel-aware asset prefixes; do not hardcode origins in components.
- Store secrets through Vercel environment variables; never commit `.env` files.
- Utility scripts (`scripts/clear-local-dbs.ts`, `scripts/clear-production-dbs.sh`) are destructive—double-check targets before running.
