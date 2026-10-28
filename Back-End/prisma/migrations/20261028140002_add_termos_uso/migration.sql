-- CreateTable
CREATE TABLE IF NOT EXISTS "termos_uso" (
    "id" SERIAL NOT NULL,
    "versao" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "publicadoEm" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "termos_uso_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "termos_uso_versao_key" ON "termos_uso"("versao");

CREATE TABLE IF NOT EXISTS "aceites_termo" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "termoId" INTEGER NOT NULL,
    "aceitoEm" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "aceites_termo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "aceites_termo_userId_termoId_key" ON "aceites_termo"("userId", "termoId");
CREATE INDEX IF NOT EXISTS "aceites_termo_userId_idx" ON "aceites_termo"("userId");

DO $migrate$ BEGIN
  ALTER TABLE "aceites_termo" ADD CONSTRAINT "aceites_termo_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $migrate$;

DO $migrate$ BEGIN
  ALTER TABLE "aceites_termo" ADD CONSTRAINT "aceites_termo_termoId_fkey"
    FOREIGN KEY ("termoId") REFERENCES "termos_uso"("id") ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $migrate$;
