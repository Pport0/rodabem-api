-- Remove colunas antigas que o código não usa mais
ALTER TABLE "password_reset_tokens" DROP COLUMN IF EXISTS "token";
ALTER TABLE "password_reset_tokens" DROP COLUMN IF EXISTS "usedAt";

-- Remove índice único em token (se ainda existir)
DROP INDEX IF EXISTS "password_reset_tokens_token_key";

-- Adiciona colunas que o schema atual exige
ALTER TABLE "password_reset_tokens" ADD COLUMN IF NOT EXISTS "codigoHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "password_reset_tokens" ADD COLUMN IF NOT EXISTS "tentativas" INTEGER NOT NULL DEFAULT 0;

-- Remove o default temporário da codigoHash
ALTER TABLE "password_reset_tokens" ALTER COLUMN "codigoHash" DROP DEFAULT;

-- Índice por userId
CREATE INDEX IF NOT EXISTS "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");
