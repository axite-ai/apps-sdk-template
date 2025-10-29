-- Better Auth Rate Limit Table
-- Required for Better Auth's built-in rate limiting feature

CREATE TABLE IF NOT EXISTS "rateLimit" (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 0,
  "lastRequest" BIGINT NOT NULL
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_key ON "rateLimit"(key);
CREATE INDEX IF NOT EXISTS idx_rate_limit_last_request ON "rateLimit"("lastRequest");

-- Comment
COMMENT ON TABLE "rateLimit" IS 'Better Auth rate limiting storage';
COMMENT ON COLUMN "rateLimit".key IS 'Unique identifier for rate limit (IP + endpoint)';
COMMENT ON COLUMN "rateLimit".count IS 'Number of requests in current window';
COMMENT ON COLUMN "rateLimit"."lastRequest" IS 'Timestamp of last request (unix milliseconds)';
