-- CreateEnum
CREATE TYPE "TipoCombustivel" AS ENUM ('DIESEL_S10', 'DIESEL_S500', 'ARLA_32');

-- CreateTable
CREATE TABLE "abastecimentos" (
    "id" SERIAL NOT NULL,
    "precoPorLitro" DOUBLE PRECISION NOT NULL,
    "totalLitros" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "quilometragem" INTEGER NOT NULL,
    "tipoCombustivel" "TipoCombustivel" NOT NULL,
    "dataAbastecimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "localDescricao" TEXT,
    "postoIdentificado" TEXT,
    "imagemUrl" TEXT,
    "observacao" TEXT,
    "userId" INTEGER NOT NULL,
    "caminhaoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abastecimentos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "abastecimentos" ADD CONSTRAINT "abastecimentos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abastecimentos" ADD CONSTRAINT "abastecimentos_caminhaoId_fkey" FOREIGN KEY ("caminhaoId") REFERENCES "Caminhao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
