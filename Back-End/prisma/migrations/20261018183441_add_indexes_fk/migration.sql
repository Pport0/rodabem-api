-- CreateIndex
CREATE INDEX "Documento_userId_idx" ON "Documento"("userId");

-- CreateIndex
CREATE INDEX "Documento_caminhaoId_idx" ON "Documento"("caminhaoId");

-- CreateIndex
CREATE INDEX "abastecimentos_userId_idx" ON "abastecimentos"("userId");

-- CreateIndex
CREATE INDEX "abastecimentos_caminhaoId_idx" ON "abastecimentos"("caminhaoId");

-- CreateIndex
CREATE INDEX "simulacoes_frete_userId_idx" ON "simulacoes_frete"("userId");

-- CreateIndex
CREATE INDEX "simulacoes_frete_caminhaoId_idx" ON "simulacoes_frete"("caminhaoId");
