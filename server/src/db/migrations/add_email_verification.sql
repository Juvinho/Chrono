-- Migration: Add email verification fields
-- Date: 2026-02-10

-- Add email verification columns to users table (safe for already-existing columns)
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN verification_token TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN verification_token_expires_at TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN verification_sent_at TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN verification_attempts INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN last_verification_email_sent_at TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Create email verification logs table for audit trail
CREATE TABLE IF NOT EXISTS email_verification_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL,
    token TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(50) CHECK (status IN ('sent', 'verified', 'expired', 'failed')),
    error_message TEXT
);

-- Create indexes (safe — IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_email_verification_logs_user_id ON email_verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_logs_token ON email_verification_logs(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_logs_created_at ON email_verification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;

-- Unique index for verified emails (partial index — safe to recreate)
DO $$ BEGIN
  CREATE UNIQUE INDEX idx_users_unique_verified_email ON users(email) WHERE email_verified = true;
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL; END $$;
