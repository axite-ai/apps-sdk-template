-- Plaid Items Table
-- Links Better Auth users to their connected Plaid bank accounts

CREATE TABLE IF NOT EXISTS plaid_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  access_token TEXT NOT NULL, -- TODO: Encrypt this in production
  institution_id TEXT,
  institution_name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active', -- active, error, revoked
  error_code TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, item_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id ON plaid_items(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_item_id ON plaid_items(item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_status ON plaid_items(status);

-- Comments
COMMENT ON TABLE plaid_items IS 'User-connected Plaid bank accounts';
COMMENT ON COLUMN plaid_items.access_token IS 'Plaid access token (should be encrypted in production)';
COMMENT ON COLUMN plaid_items.status IS 'Connection status: active, error, or revoked';
