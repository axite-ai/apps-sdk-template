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

*   **`app/mcp/route.ts`:** The core MCP server that registers and exposes tools to ChatGPT. It handles requests for financial data, such as account balances, transactions, and spending insights. Tools require OAuth authentication, active subscriptions, and linked Plaid accounts.
*   **`lib/services/`:** Service layer for business logic:
    *   `plaid-service.ts` - Plaid API interactions (balances, transactions, insights)
    *   `user-service.ts` - User-to-Plaid item mappings with encrypted access tokens
    *   `encryption-service.ts` - AES-256-GCM encryption for sensitive data
*   **`lib/auth/index.ts`:** Better Auth configuration with MCP plugin (OAuth 2.1 for ChatGPT/Claude) and Stripe plugin (subscription management)
*   **`lib/db/`:** Drizzle ORM database layer:
    *   `index.ts` - Database instance and connection pool exports
    *   `schema.ts` - Type-safe schema definitions (Better Auth tables + custom Plaid tables)
*   **`lib/utils/subscription-helpers.ts`:** Subscription validation utilities
*   **`widgets/*.html`:** Static HTML widgets rendered in ChatGPT interface (self-contained with inline styles)
*   **`middleware.ts`:** CORS handling for cross-origin RSC requests in ChatGPT iframe
*   **`app/layout.tsx`:** Root layout with `NextChatSDKBootstrap` for browser API patches (history, fetch, HTML attributes)

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

The project includes type checking using TypeScript.

```bash
pnpm typecheck
```

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
