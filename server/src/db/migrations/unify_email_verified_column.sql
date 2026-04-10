-- MNT-08: Unify dual email verification columns
-- Sync any rows where is_verified=TRUE but email_verified=FALSE (data repair)
UPDATE users
SET email_verified = TRUE
WHERE is_verified = TRUE AND email_verified = FALSE;

-- Sync the reverse too
UPDATE users
SET is_verified = TRUE
WHERE email_verified = TRUE AND is_verified = FALSE;

-- Future: once all code paths use email_verified only, is_verified can be dropped.
-- For now we keep both in sync until a follow-up migration removes is_verified.
