-- CreateEnum
CREATE TYPE "TipoCarga" AS ENUM ('GERAL', 'GRANEL_SOLIDO', 'GRANEL_LIQUIDO', 'FRIGORIFICADA', 'PERIGOSA', 'CONTEINER');

-- AlterTable
ALTER TABLE "Caminhao" ADD COLUMN     "numeroEixos" INTEGER;

-- CreateTable
CREATE TABLE "tabela_antt" (
    "id" SERIAL NOT NULL,
    "numeroEixos" INTEGER NOT NULL,
    "tipoCarga" "TipoCarga" NOT NULL,
    "distanciaMin" INTEGER NOT NULL,
    "distanciaMax" INTEGER NOT NULL,
    "valorPorKm" DOUBLE PRECISION NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tabela_antt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulacoes_frete" (
    "id" SERIAL NOT NULL,
    "origem" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "distanciaKm" DOUBLE PRECISION NOT NULL,
    "pedagiosEstimados" DOUBLE PRECISION NOT NULL,
    "consumoMedioKmL" DOUBLE PRECISION NOT NULL,
    "precoCombustivel" DOUBLE PRECISION NOT NULL,
    "litrosNecessarios" DOUBLE PRECISION NOT NULL,
    "custoCombustivel" DOUBLE PRECISION NOT NULL,
    "tipoCarga" "TipoCarga" NOT NULL,
    "retornoVazio" BOOLEAN NOT NULL DEFAULT false,
    "altoDesempenho" BOOLEAN NOT NULL DEFAULT false,
    "valorMinimoAntt" DOUBLE PRECISION NOT NULL,
    "valorLiquidoEstimado" DOUBLE PRECISION NOT NULL,
    "userId" INTEGER NOT NULL,
    "caminhaoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulacoes_frete_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "simulacoes_frete" ADD CONSTRAINT "simulacoes_frete_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulacoes_frete" ADD CONSTRAINT "simulacoes_frete_caminhaoId_fkey" FOREIGN KEY ("caminhaoId") REFERENCES "Caminhao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
