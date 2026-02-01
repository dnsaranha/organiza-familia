-- Add processed_at column to account_deletion_requests if it doesn't exist
ALTER TABLE IF EXISTS account_deletion_requests
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
