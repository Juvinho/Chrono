-- Sync email verification columns for existing users
-- If is_verified = TRUE (old column), ensure email_verified = TRUE too
UPDATE users SET email_verified = TRUE WHERE is_verified = TRUE AND (email_verified = FALSE OR email_verified IS NULL);

-- If email_verified = TRUE (new column), ensure is_verified = TRUE too
UPDATE users SET is_verified = TRUE WHERE email_verified = TRUE AND is_verified = FALSE;
