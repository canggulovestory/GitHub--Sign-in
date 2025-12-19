-- =============================================
-- GAIDE Travel OS - Supabase Setup Script
-- =============================================
-- Run this SQL in your Supabase SQL Editor:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your project
-- 3. Go to SQL Editor (left sidebar)
-- 4. Paste this entire script and click "Run"
-- =============================================

-- Step 1: Create the user_data table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_data (
    email TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Disable Row Level Security (simpler for personal apps)
-- This allows the anon key to read/write all rows
ALTER TABLE user_data DISABLE ROW LEVEL SECURITY;

-- Step 3: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_data_email ON user_data(email);

-- Optional: Enable RLS with permissive policies (uncomment if you prefer RLS)
-- ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow all access" ON user_data;
-- CREATE POLICY "Allow all access" ON user_data FOR ALL USING (true) WITH CHECK (true);

-- Verification query - run this to check setup
SELECT 
    'Table exists: ' || (SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_data'))::text AS status;
