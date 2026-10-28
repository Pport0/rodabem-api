-- Migration: refactor password_reset_tokens para código de 8 dígitos com hash

DELETE FROM password_reset_tokens;

ALTER TABLE password_reset_tokens
  DROP COLUMN IF EXISTS token,
  DROP COLUMN IF EXISTS "usedAt",
  ADD COLUMN "codigoHash" TEXT NOT NULL DEFAULT '',
  ADD COLUMN tentativas    INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "password_reset_tokens_userId_idx"
  ON password_reset_tokens ("userId");

UPDATE usuarios SET email = lower(email);
