-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "assignedDriverId" TEXT;

-- CreateIndex
CREATE INDEX "Order_restaurantId_assignedDriverId_idx" ON "Order"("restaurantId", "assignedDriverId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
