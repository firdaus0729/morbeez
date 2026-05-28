-- Console invite onboarding: email verification + shared org password flow

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN admin_users.email_verified_at IS
  'Set when employee completes email invite link and organization password';

-- Existing active accounts are treated as already verified
UPDATE admin_users
SET email_verified_at = COALESCE(email_verified_at, created_at, NOW())
WHERE active = true AND email_verified_at IS NULL;

ALTER TABLE employee_access_tokens
  DROP CONSTRAINT IF EXISTS employee_access_tokens_purpose_check;

ALTER TABLE employee_access_tokens
  ADD CONSTRAINT employee_access_tokens_purpose_check
  CHECK (purpose IN ('setup_password', 'reset_password', 'email_invite'));
