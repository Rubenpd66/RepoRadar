ALTER TABLE "Task" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
WITH ordered AS (
 SELECT "id", ROW_NUMBER() OVER (PARTITION BY "opportunityId" ORDER BY "createdAt", "id") - 1 AS position
 FROM "Task"
)
UPDATE "Task" SET "position" = ordered.position FROM ordered WHERE "Task"."id" = ordered."id";
CREATE UNIQUE INDEX "Task_opportunityId_position_key" ON "Task"("opportunityId", "position");
