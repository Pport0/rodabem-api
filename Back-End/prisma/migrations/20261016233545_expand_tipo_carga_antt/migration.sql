/*
  Warnings:

  - The values [PERIGOSA] on the enum `TipoCarga` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TipoCarga_new" AS ENUM ('GERAL', 'GRANEL_SOLIDO', 'GRANEL_LIQUIDO', 'FRIGORIFICADA', 'CONTEINER', 'PERIGOSA_GERAL', 'PERIGOSA_CONTEINERIZADA', 'PERIGOSA_FRIGORIFICADA', 'PERIGOSA_GRANEL_LIQUIDO', 'PERIGOSA_GRANEL_SOLIDO');
ALTER TABLE "tabela_antt" ALTER COLUMN "tipoCarga" TYPE "TipoCarga_new" USING ("tipoCarga"::text::"TipoCarga_new");
ALTER TABLE "simulacoes_frete" ALTER COLUMN "tipoCarga" TYPE "TipoCarga_new" USING ("tipoCarga"::text::"TipoCarga_new");
ALTER TYPE "TipoCarga" RENAME TO "TipoCarga_old";
ALTER TYPE "TipoCarga_new" RENAME TO "TipoCarga";
DROP TYPE "public"."TipoCarga_old";
COMMIT;
