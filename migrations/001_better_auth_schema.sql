-- Better Auth Database Schema
-- This migration creates all tables required by Better Auth and the MCP plugin

-- Users table
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  name TEXT,
  image TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  -- Custom fields from Better Auth config
  "plaidItemIds" TEXT NOT NULL DEFAULT '[]'
);

-- Sessions table
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMP NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

-- Accounts table (for OAuth providers)
CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP,
  "refreshTokenExpiresAt" TIMESTAMP,
  scope TEXT,
  password TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("providerId", "accountId")
);

-- Verification table (for email verification, password reset, etc.)
CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP
);

-- OAuth-specific tables for MCP plugin

-- OAuth Clients (Dynamic Client Registration)
CREATE TABLE IF NOT EXISTS "oauthClient" (
  id TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL UNIQUE,
  "clientSecret" TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "redirectUris" TEXT[] NOT NULL,
  "grantTypes" TEXT[] NOT NULL DEFAULT ARRAY['authorization_code', 'refresh_token'],
  "responseTypes" TEXT[] NOT NULL DEFAULT ARRAY['code'],
  "tokenEndpointAuthMethod" TEXT NOT NULL DEFAULT 'client_secret_basic',
  scope TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- OAuth Authorization Codes
CREATE TABLE IF NOT EXISTS "oauthCode" (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  "clientId" TEXT NOT NULL REFERENCES "oauthClient"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "redirectUri" TEXT NOT NULL,
  "codeChallenge" TEXT,
  "codeChallengeMethod" TEXT,
  scope TEXT,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- OAuth Access Tokens
CREATE TABLE IF NOT EXISTS "oauthToken" (
  id TEXT PRIMARY KEY,
  "accessToken" TEXT NOT NULL UNIQUE,
  "refreshToken" TEXT UNIQUE,
  "clientId" TEXT NOT NULL REFERENCES "oauthClient"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  scope TEXT,
  "accessTokenExpiresAt" TIMESTAMP NOT NULL,
  "refreshTokenExpiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session("userId");
CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON account("userId");
CREATE INDEX IF NOT EXISTS idx_account_provider ON account("providerId", "accountId");
CREATE INDEX IF NOT EXISTS idx_oauth_code_code ON "oauthCode"(code);
CREATE INDEX IF NOT EXISTS idx_oauth_code_client ON "oauthCode"("clientId");
CREATE INDEX IF NOT EXISTS idx_oauth_token_access ON "oauthToken"("accessToken");
CREATE INDEX IF NOT EXISTS idx_oauth_token_refresh ON "oauthToken"("refreshToken");
CREATE INDEX IF NOT EXISTS idx_oauth_token_client ON "oauthToken"("clientId");

-- Comments for documentation
COMMENT ON TABLE "user" IS 'Better Auth users table';
COMMENT ON TABLE session IS 'User sessions for authentication';
COMMENT ON TABLE account IS 'OAuth provider accounts linked to users';
COMMENT ON TABLE verification IS 'Email verification and password reset tokens';
COMMENT ON TABLE "oauthClient" IS 'Registered OAuth clients (DCR)';
COMMENT ON TABLE "oauthCode" IS 'OAuth authorization codes (PKCE)';
COMMENT ON TABLE "oauthToken" IS 'OAuth access and refresh tokens';
