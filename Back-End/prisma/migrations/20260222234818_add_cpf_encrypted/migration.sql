/*
  Warnings:

  - Added the required column `cpfEncrypted` to the `usuarios` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "cpfEncrypted" TEXT NOT NULL;
