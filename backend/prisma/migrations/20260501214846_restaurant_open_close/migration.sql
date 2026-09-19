-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "closedMessage" TEXT,
ADD COLUMN     "isOpen" BOOLEAN NOT NULL DEFAULT true;
