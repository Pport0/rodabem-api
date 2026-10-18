-- CreateEnum
CREATE TYPE "ComposicaoVeicular" AS ENUM ('COM_CARRETA', 'SEM_CARRETA');

-- AlterTable
ALTER TABLE "tabela_antt" ADD COLUMN "composicaoVeicular" "ComposicaoVeicular" NOT NULL DEFAULT 'COM_CARRETA';
