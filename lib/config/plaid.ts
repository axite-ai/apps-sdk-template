import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

function getPlaidEnvironment(env: string) {
  switch (env.toLowerCase()) {
    case "sandbox":
      return PlaidEnvironments.sandbox;
    case "development":
      return PlaidEnvironments.development;
    case "production":
      return PlaidEnvironments.production;
    default:
      throw new Error(
        `Invalid PLAID_ENV: ${env}. Must be 'sandbox', 'development', or 'production'`
      );
  }
}

let plaidClientInstance: PlaidApi | null = null;

/**
 * Returns a singleton Plaid API client.
 * The client is lazily initialized the first time it's requested.
 */
export function getPlaidClient(): PlaidApi {
  if (plaidClientInstance) return plaidClientInstance;

  const { PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV } = process.env;
  if (!PLAID_CLIENT_ID || !PLAID_SECRET || !PLAID_ENV) {
    throw new Error(
      "Missing one or more required Plaid environment variables."
    );
  }

  const configuration = new Configuration({
    basePath: getPlaidEnvironment(PLAID_ENV),
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": PLAID_CLIENT_ID,
        "PLAID-SECRET": PLAID_SECRET,
      },
    },
  });

  plaidClientInstance = new PlaidApi(configuration);
  return plaidClientInstance;
}
