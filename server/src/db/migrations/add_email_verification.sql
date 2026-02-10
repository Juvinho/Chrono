-- Migration: Add email verification fields
-- Date: 2026-02-10

-- Add email verification columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;

-- Create email verification logs table for audit trail
CREATE TABLE IF NOT EXISTS email_verification_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(50) CHECK (status IN ('sent', 'verified', 'expired', 'failed')),
    error_message TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_logs_user_id ON email_verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_logs_token ON email_verification_logs(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_logs_created_at ON email_verification_logs(sent_at);

-- Create index for verification_token searches
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;

-- Add column for rate limiting check
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_verification_email_sent_at TIMESTAMP;

-- Add constraint to ensure email is unique if verified
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS unique_verified_email UNIQUE (email) WHERE email_verified = true;
