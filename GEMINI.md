# Project Overview

This is a Next.js application that integrates with the ChatGPT Apps SDK to provide financial analysis tools within the ChatGPT interface. The application uses the Model Context Protocol (MCP) to expose tools and render widgets in ChatGPT.

## Key Technologies

*   **Framework:** Next.js
*   **Language:** TypeScript
*   **Authentication:** Better Auth
*   **Financial Data:** Plaid
*   **Subscription/Payments:** Stripe
*   **Database:** PostgreSQL
*   **Styling:** Tailwind CSS

## Architecture

The application is structured as a standard Next.js project with the following key components:

*   **`app/mcp/route.ts`:** The core MCP server that registers and exposes tools to ChatGPT. It handles requests for financial data, such as account balances, transactions, and spending insights.
*   **`lib/services/plaid-service.ts`:** This service contains the logic for interacting with the Plaid API to fetch financial data.
*   **`lib/auth`:** This directory contains the authentication logic, which is built on top of the Better Auth library.
*   **`widgets/*.html`:** These are the HTML files for the widgets that are rendered in the ChatGPT interface.
*   **`middleware.ts`:** This middleware handles CORS requests to allow the application to be embedded in the ChatGPT iframe.
*   **`app/layout.tsx`:** The root layout of the application, which includes the `NextChatSDKBootstrap` component to patch browser APIs for the ChatGPT iframe.

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

## Testing

The project includes type checking using TypeScript.

```bash
pnpm typecheck
```

# Development Conventions

*   **Package Manager:** The project uses `pnpm` as the package manager.
*   **Coding Style:** The project follows standard TypeScript and React conventions.
*   **Linting:** The project uses Next.js's built-in ESLint configuration.
*   **Commits:** Commit messages should follow the Conventional Commits specification.
