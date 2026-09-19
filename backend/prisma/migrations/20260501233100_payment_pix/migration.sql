-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CASH', 'CARD');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentChangeCents" INTEGER,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'PIX',
ADD COLUMN     "paymentProofUrl" TEXT;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "pixKey" TEXT;
