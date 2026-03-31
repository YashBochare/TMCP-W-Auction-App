-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('PENDING', 'SOLD', 'UNSOLD');

-- CreateEnum
CREATE TYPE "BiddingStatus" AS ENUM ('IDLE', 'OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorCode" TEXT NOT NULL,
    "purse" INTEGER NOT NULL DEFAULT 100000,
    "accessCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "role" TEXT NOT NULL,
    "clubLevel" TEXT NOT NULL,
    "speakingSkill" TEXT NOT NULL,
    "funTitle" TEXT NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "status" "PlayerStatus" NOT NULL DEFAULT 'PENDING',
    "soldPrice" INTEGER,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionState" (
    "id" TEXT NOT NULL,
    "currentPlayerId" TEXT,
    "currentHighestBid" INTEGER NOT NULL DEFAULT 0,
    "currentHighestBidderId" TEXT,
    "biddingStatus" "BiddingStatus" NOT NULL DEFAULT 'IDLE',
    "timerSeconds" INTEGER NOT NULL DEFAULT 20,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuctionState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_accessCode_key" ON "Team"("accessCode");

-- CreateIndex
CREATE INDEX "Player_basePrice_idx" ON "Player"("basePrice" DESC);

-- CreateIndex
CREATE INDEX "Player_status_idx" ON "Player"("status");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionState" ADD CONSTRAINT "AuctionState_currentPlayerId_fkey" FOREIGN KEY ("currentPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionState" ADD CONSTRAINT "AuctionState_currentHighestBidderId_fkey" FOREIGN KEY ("currentHighestBidderId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
