-- Morbeez website login — farmer archive fields (not Shopify Customer Accounts)

ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE farmers ALTER COLUMN phone DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_farmers_email ON farmers(email) WHERE email IS NOT NULL;

ALTER TABLE farmers DROP CONSTRAINT IF EXISTS farmers_email_or_phone;
ALTER TABLE farmers ADD CONSTRAINT farmers_email_or_phone CHECK (
  email IS NOT NULL OR (phone IS NOT NULL AND phone <> '')
);

COMMENT ON COLUMN farmers.email IS 'Website login email — unique when set';
COMMENT ON COLUMN farmers.password_hash IS 'scrypt hash salt:hex — website auth only';
