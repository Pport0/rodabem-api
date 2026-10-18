-- Criar tabela de versões
CREATE TABLE "versoes_antt" (
    "id" SERIAL NOT NULL,
    "resolucao" TEXT NOT NULL,
    "vigenteDesde" TIMESTAMP(3) NOT NULL,
    "vigenteAte" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "versoes_antt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "versoes_antt_resolucao_key" ON "versoes_antt"("resolucao");

-- Inserir versão inicial para absorver os dados existentes
INSERT INTO "versoes_antt" ("resolucao", "vigenteDesde", "criadoEm")
VALUES ('Res. 6.076/2026', '2026-01-01 00:00:00', CURRENT_TIMESTAMP);

-- Adicionar versaoId em tabela_antt como nullable primeiro
ALTER TABLE "tabela_antt" ADD COLUMN "versaoId" INTEGER;

-- Associar todas as linhas existentes à versão inicial
UPDATE "tabela_antt" SET "versaoId" = 1;

-- Remover coluna antiga e tornar versaoId NOT NULL
ALTER TABLE "tabela_antt" DROP COLUMN "atualizadoEm";
ALTER TABLE "tabela_antt" ALTER COLUMN "versaoId" SET NOT NULL;

-- Adicionar versaoAnttId em simulacoes_frete como nullable primeiro
ALTER TABLE "simulacoes_frete" ADD COLUMN "versaoAnttId" INTEGER;

-- Associar simulações existentes à versão inicial
UPDATE "simulacoes_frete" SET "versaoAnttId" = 1;

-- Tornar versaoAnttId NOT NULL
ALTER TABLE "simulacoes_frete" ALTER COLUMN "versaoAnttId" SET NOT NULL;

-- Índices
CREATE INDEX "tabela_antt_versaoId_idx" ON "tabela_antt"("versaoId");
CREATE INDEX "simulacoes_frete_versaoAnttId_idx" ON "simulacoes_frete"("versaoAnttId");

-- Foreign keys
ALTER TABLE "tabela_antt" ADD CONSTRAINT "tabela_antt_versaoId_fkey"
    FOREIGN KEY ("versaoId") REFERENCES "versoes_antt"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "simulacoes_frete" ADD CONSTRAINT "simulacoes_frete_versaoAnttId_fkey"
    FOREIGN KEY ("versaoAnttId") REFERENCES "versoes_antt"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;