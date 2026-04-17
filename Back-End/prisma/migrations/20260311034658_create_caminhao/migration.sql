-- CreateTable
CREATE TABLE "Caminhao" (
    "id" SERIAL NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "renavam" TEXT NOT NULL,
    "crv" TEXT,
    "marca" TEXT,
    "especieTipo" TEXT,
    "chassi" TEXT,
    "cor" TEXT,
    "anoFabricacao" INTEGER,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caminhao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Caminhao_userId_key" ON "Caminhao"("userId");

-- AddForeignKey
ALTER TABLE "Caminhao" ADD CONSTRAINT "Caminhao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
