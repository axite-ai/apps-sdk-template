# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

# Database migrations
pnpm migrate
```

## Architecture

### MCP Server (`app/mcp/route.ts`)

The core of the application. Registers financial tools that ChatGPT can invoke:

**Authenticated Tools (require OAuth + subscription + Plaid connection):**
- `get_account_balances` - Fetch account balances from all linked accounts
- `get_transactions` - Retrieve recent transactions with date filtering
- `get_spending_insights` - Analyze spending by category
- `check_account_health` - Check for low balances, overdrafts, high credit utilization

**Free Tools (no authentication required):**
- `get_financial_tips` - Educational financial advice by topic
- `calculate_budget` - 50/30/20 budget calculator

All authenticated tools follow a three-tier authorization pattern:
1. Check if user is logged in (OAuth session)
2. Check if user has active subscription (via `hasActiveSubscription()`)
3. Check if user has linked Plaid accounts (via `UserService.getUserAccessTokens()`)

Tools return structured responses with OpenAI-specific metadata for widget rendering.

### Authentication (`lib/auth/index.ts`)

Uses Better Auth with two plugins:
- **MCP plugin**: Provides OAuth 2.1 flows for ChatGPT/Claude integration with trusted clients (`chatgpt.com`, `claude.ai`)
- **Stripe plugin**: Manages subscriptions (basic/pro/enterprise plans) with trial support

Session data stored in PostgreSQL. Rate limiting and caching use Redis as secondary storage.

### Data Layer

**Services:**
- `lib/services/plaid-service.ts` - All Plaid API interactions (balances, transactions, insights, health checks)
- `lib/services/user-service.ts` - Manages user-to-Plaid item mappings, encrypts/decrypts access tokens
- `lib/services/encryption-service.ts` - AES-256-GCM encryption for Plaid tokens at rest
- `lib/utils/subscription-helpers.ts` - Subscription status validation

**Database:**
- PostgreSQL for user data, sessions, Plaid items, subscriptions
- Redis for rate limiting and caching
- Migrations in `migrations/*.sql` run via `pnpm migrate`

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

1. Register via `server.registerTool(name, config, handler)`
2. Define `inputSchema` with Zod validation
3. Add OpenAI metadata for widget rendering:
   ```typescript
   _meta: {
     "openai/outputTemplate": "ui://widget/your-widget.html",
     "openai/toolInvocation/invoking": "Loading message...",
     "openai/toolInvocation/invoked": "Success message",
     "openai/widgetAccessible": true/false,
     "openai/resultCanProduceWidget": true/false,
   }
   ```
4. For authenticated tools, add `securitySchemes: [{ type: "oauth2" }]` and implement the three-tier auth check
5. Return structured content with `structuredContent` field for widget consumption

## Database Schema

Key tables (created via migrations):
- `user` - Better Auth users with OAuth identities
- `session` - Active user sessions
- `plaid_items` - User-to-Plaid account mappings (access tokens encrypted)
- `subscription` - Stripe subscription records with plan limits
- `account` - OAuth accounts (ChatGPT, Claude)
- `migrations` - Migration tracking

## Path Aliases

TypeScript path alias: `@/*` maps to project root (e.g., `@/lib/auth` → `/lib/auth`)

## Deployment

Designed for Vercel deployment. Base URL auto-detection via `baseUrl.ts` handles:
- Production URLs via `VERCEL_PROJECT_PRODUCTION_URL`
- Preview/branch URLs via `VERCEL_BRANCH_URL`
- Local development fallback to `http://localhost:3000`

## Testing MCP Integration

1. Run `pnpm dev` locally
2. MCP server available at `http://localhost:3000/mcp`
3. To connect from ChatGPT:
   - Deploy to Vercel or use ngrok for local testing
   - In ChatGPT Settings → Connectors → Create, add `https://your-domain.com/mcp`
   - Requires ChatGPT developer mode access
