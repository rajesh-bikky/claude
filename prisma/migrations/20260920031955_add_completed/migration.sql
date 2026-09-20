-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Entry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Entry" ("category", "createdAt", "id", "label", "sessionId", "text") SELECT "category", "createdAt", "id", "label", "sessionId", "text" FROM "Entry";
DROP TABLE "Entry";
ALTER TABLE "new_Entry" RENAME TO "Entry";
CREATE INDEX "Entry_createdAt_idx" ON "Entry"("createdAt");
CREATE INDEX "Entry_category_idx" ON "Entry"("category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
