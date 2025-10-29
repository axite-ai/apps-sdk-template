-- Production Security Enhancements
-- Adds encryption support and webhook tracking

-- 1. Add encrypted token column and keep old one for migration
ALTER TABLE plaid_items
  ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT;

-- 2. Create webhook log table for tracking Plaid webhooks
CREATE TABLE IF NOT EXISTS plaid_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL,
  webhook_code TEXT NOT NULL,
  item_id TEXT,
  error_code TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP,
  received_at TIMESTAMP NOT NULL DEFAULT NOW(),
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL
);

-- 3. Create rate limit tracking table (in-memory cache with Redis, this is for persistence)
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or user ID
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP NOT NULL DEFAULT NOW(),
  last_request_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(identifier, endpoint, window_start)
);

-- 4. Create audit log table for security events
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- login, token_created, token_refreshed, item_connected, item_error, etc.
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plaid_webhooks_item_id ON plaid_webhooks(item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_webhooks_processed ON plaid_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_plaid_webhooks_received ON plaid_webhooks(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_plaid_webhooks_type_code ON plaid_webhooks(webhook_type, webhook_code);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);

-- Comments
COMMENT ON TABLE plaid_webhooks IS 'Plaid webhook events for tracking token expiration and errors';
COMMENT ON TABLE rate_limits IS 'Rate limit tracking for API endpoints (backup for Redis)';
COMMENT ON TABLE audit_logs IS 'Security audit log for all important events';
COMMENT ON COLUMN plaid_items.access_token_encrypted IS 'AES-256-GCM encrypted Plaid access token';
COMMENT ON COLUMN plaid_items.access_token IS 'Deprecated: will be removed after migration to encrypted tokens';
