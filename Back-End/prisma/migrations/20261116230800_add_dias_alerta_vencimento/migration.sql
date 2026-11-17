ALTER TABLE usuarios
  ADD COLUMN "diasAlertaVencimento" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_diasAlertaVencimento_check
  CHECK ("diasAlertaVencimento" IN (7, 15, 30, 60));
