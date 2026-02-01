-- Add user_id column to account_deletion_requests
ALTER TABLE account_deletion_requests
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Enable Row Level Security
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert rows where user_id is their own
CREATE POLICY "Users can insert own deletion requests"
ON account_deletion_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- Policy: Allow users to view their own requests
CREATE POLICY "Users can view own deletion requests"
ON account_deletion_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);
