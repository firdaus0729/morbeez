-- Individual staff passwords + self-service forgot-password tokens

CREATE TABLE IF NOT EXISTS admin_password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_password_reset_tokens_lookup
  ON admin_password_reset_tokens(admin_user_id, expires_at)
  WHERE used_at IS NULL;

COMMENT ON TABLE admin_password_reset_tokens IS
  'Self-service forgot-password tokens (hashed); separate from employee invite tokens';
