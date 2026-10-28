-- Garante no máximo 1 token ativo por usuário (necessário para upsert)
-- Remove duplicatas antes de criar o índice (segurança)
DELETE FROM password_reset_tokens a
  USING password_reset_tokens b
  WHERE a.id < b.id AND a."userId" = b."userId";

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_userId_key"
  ON password_reset_tokens ("userId");
