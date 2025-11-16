# Transaction Synchronization Logic

This document outlines the process for synchronizing Plaid transactions with the local database. The system has been migrated from the legacy `/transactions/get` endpoint to the modern `/transactions/sync` endpoint for better efficiency and scalability.

## Core Components

- **`lib/services/plaid-service.ts`**: Contains the core logic for interacting with the Plaid API.
  - `syncTransactionsForItem(itemId)`: The main function for synchronizing transactions for a single Plaid item.
  - `fetchTransactionUpdates(accessToken, cursor)`: A helper function that pages through the `/transactions/sync` endpoint to retrieve all available updates.
- **`lib/db/schema.ts`**: Defines the database schema, including the new `plaid_accounts` and `plaid_transactions` tables.
- **`lib/services/webhook-service.ts`**: Handles incoming webhooks from Plaid.
- **`app/mcp/route.ts`**: The MCP server that exposes the `get_transactions` tool.

## Synchronization Flow

1.  **Triggering a Sync**: A transaction sync can be triggered in two ways:
    *   **Webhook**: Plaid sends a `SYNC_UPDATES_AVAILABLE` webhook to our server, indicating that new transaction data is available for an item.
    *   **On-Demand**: When a user calls the `get_transactions` tool, a sync is initiated for all of their items to ensure the data is fresh before being returned.

2.  **`syncTransactionsForItem(itemId)`**: This function orchestrates the sync process for a single item.
    *   It retrieves the item's `accessToken` and `transactionsCursor` from the `plaid_items` table in the database.
    *   It calls `fetchTransactionUpdates` to get the latest transaction data from Plaid.
    *   It fetches the latest account data using `/accounts/get`.
    *   It upserts the account data into the `plaid_accounts` table.
    *   It processes the `added`, `modified`, and `removed` transactions returned from Plaid:
        *   `added` and `modified` transactions are upserted into the `plaid_transactions` table.
        *   `removed` transactions are deleted from the `plaid_transactions` table.
    *   Finally, it updates the `transactionsCursor` for the item in the `plaid_items` table.

3.  **`fetchTransactionUpdates(accessToken, cursor)`**: This function handles the pagination logic for the `/transactions/sync` endpoint.
    *   It repeatedly calls the endpoint with the latest cursor until `has_more` is `false`.
    *   It aggregates the `added`, `modified`, and `removed` transactions from all pages into a single response.

## Database Schema

-   **`plaid_items`**:
    *   A `transactions_cursor` column has been added to store the cursor for each item, allowing us to fetch only new updates from Plaid.
-   **`plaid_accounts`**:
    *   This new table stores account-level information, such as the account name, mask, and balances.
-   **`plaid_transactions`**:
    *   This new table stores individual transactions, with a foreign key relationship to the `plaid_accounts` table. It includes all relevant transaction data from Plaid, as well as a `rawData` column for storing the full, unprocessed transaction object.

## Webhook Handling

-   The `handleTransactionsWebhook` function in `lib/services/webhook-service.ts` now has a case for `SYNC_UPDATES_AVAILABLE`.
-   When this webhook is received, it calls `syncTransactionsForItem` with the corresponding `item_id` to initiate a sync.

## MCP Tool (`get_transactions`)

-   The `get_transactions` tool in `app/mcp/route.ts` has been refactored to:
    1.  Trigger `syncTransactionsForItem` for all of the user's items.
    2.  Query the local `plaidTransactions` table to retrieve the requested transactions.
    3.  Perform filtering and metadata calculations on the data retrieved from the local database.

## Testing & Environment Notes

- Integration coverage lives in `tests/integration/services.test.ts` (`TransactionsService` + `Plaid Service Integration`). Those suites rely on Vitest's [`test.env`](https://vitest.dev/config/#test-env) defaults in `vitest.config.ts` so Plaid/Stripe/encryption secrets don't need to be injected just to run sync tests.
- When adding new sync behaviors (webhook edge cases, cursor migrations), extend the integration suite first; the deterministic env defaults ensure new assertions won't flake due to missing env vars.
