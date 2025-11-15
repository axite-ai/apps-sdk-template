# Repository Guidelines

This guide helps agents contribute to AskMyMoney's ChatGPT-ready Next.js repo confidently and consistently. Review the resources in `llm_context/`—Apps SDK docs/examples live under `llm_context/appssdk/`, Better Auth plugins live under `llm_context/betterauth/`, and the empty `llm_context/mcp/` folder is reserved for MCP-specific notes you might add—to fully understand how the Apps SDK and MCP integrations work with this project.

## Project Structure & Module Organization
- `app/` holds Next.js routes; `app/mcp/route.ts` exposes MCP tools/resources consumed by ChatGPT.
- `lib/` centralizes auth, config, services, and shared types; prefer importing from here over duplicating logic.
  - `lib/db/` contains Drizzle ORM setup: `index.ts` exports db instance and pool, `schema.ts` defines all tables
- `widgets/` serves static HTML widgets for iframe rendering; keep assets self-contained with inline styles only.
- Operational scripts live in `scripts/`; Drizzle migrations are in `drizzle/`. Static assets belong in `public/`.

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

## Testing Guidelines
- There is no bundled unit runner yet; always run `pnpm lint` and `pnpm typecheck` before committing.
- Add targeted tests when introducing infrastructure; name files `*.test.ts` or `*.spec.ts`.
- Capture manual verification notes for MCP endpoints (`/mcp`) and subscription flows inside the PR description.
- For database or auth changes, run `pnpm db:generate` then `pnpm db:migrate` against a disposable database and confirm schema diffs.
- When modifying Better Auth config or adding plugins, run `pnpm db:schema` to regenerate the schema file.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat(subscription): hook up stripe subscriptions`) as seen in the Git history.
- Keep commits focused and rebased; avoid merge commits in feature branches.
- PRs need a summary, tests run, environment/migration notes, and UI screenshots when surfaces change.
- Link issues or tickets and request reviews early so security-sensitive updates receive double approval.

## Environment & Configuration
- Copy `.env.example` to `.env.local` and populate Plaid, Stripe, Redis, Better Auth, and database secrets.
- `baseUrl.ts` sets Vercel-aware asset prefixes; do not hardcode origins in components.
- Store secrets through Vercel environment variables; never commit `.env` files.
- Utility scripts (`scripts/clear-local-dbs.ts`, `scripts/clear-production-dbs.sh`) are destructive—double-check targets before running.
