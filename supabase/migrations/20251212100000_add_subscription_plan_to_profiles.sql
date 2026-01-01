ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';

UPDATE profiles SET subscription_plan = 'free' WHERE subscription_plan IS NULL;
