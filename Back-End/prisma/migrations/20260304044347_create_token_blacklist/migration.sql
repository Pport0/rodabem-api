/*
  Warnings:

  - You are about to drop the `TokenBlacklist` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "TokenBlacklist";

-- CreateTable
CREATE TABLE "TokenBlackList" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenBlackList_pkey" PRIMARY KEY ("id")
);
