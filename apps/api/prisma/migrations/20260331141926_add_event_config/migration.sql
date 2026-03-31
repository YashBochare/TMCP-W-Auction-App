-- CreateTable
CREATE TABLE "EventConfig" (
    "id" TEXT NOT NULL,
    "startingPurse" INTEGER NOT NULL DEFAULT 100000,
    "maxSquadSize" INTEGER NOT NULL DEFAULT 7,
    "minBasePrice" INTEGER NOT NULL DEFAULT 3000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventConfig_pkey" PRIMARY KEY ("id")
);
