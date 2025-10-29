-- Make access_token column nullable for migration to encrypted tokens
-- This allows us to store only access_token_encrypted going forward

ALTER TABLE plaid_items
  ALTER COLUMN access_token DROP NOT NULL;

COMMENT ON COLUMN plaid_items.access_token IS 'Deprecated: now nullable, use access_token_encrypted instead';
