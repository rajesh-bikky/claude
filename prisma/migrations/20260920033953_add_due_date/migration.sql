-- AlterTable
ALTER TABLE "Entry" ADD COLUMN "dueDate" DATETIME;

-- CreateIndex
CREATE INDEX "Entry_dueDate_idx" ON "Entry"("dueDate");
