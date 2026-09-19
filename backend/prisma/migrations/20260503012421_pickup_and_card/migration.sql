-- CreateEnum
CREATE TYPE "FulfillmentMethod" AS ENUM ('DELIVERY', 'PICKUP');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('DEBIT', 'CREDIT');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cardBrand" TEXT,
ADD COLUMN     "cardType" "CardType",
ADD COLUMN     "fulfillmentMethod" "FulfillmentMethod" NOT NULL DEFAULT 'DELIVERY',
ALTER COLUMN "addressStreet" DROP NOT NULL,
ALTER COLUMN "addressNumber" DROP NOT NULL,
ALTER COLUMN "addressNeighborhood" DROP NOT NULL;
