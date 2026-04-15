-- CreateTable
CREATE TABLE "Documento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT,
    "arquivoUrl" TEXT,
    "userId" INTEGER NOT NULL,
    "caminhaoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_caminhaoId_fkey" FOREIGN KEY ("caminhaoId") REFERENCES "Caminhao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
