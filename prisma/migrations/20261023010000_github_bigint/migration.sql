-- GitHub issue IDs exceed signed 32-bit integers. Keep the public issue number as Int.
ALTER TABLE "SavedOpportunity" ALTER COLUMN "githubId" TYPE BIGINT;
