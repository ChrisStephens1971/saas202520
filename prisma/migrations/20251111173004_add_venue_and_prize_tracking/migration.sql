-- CreateTable: Venues
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" VARCHAR(500),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "zip" VARCHAR(20),
    "country" VARCHAR(2) DEFAULT 'US',
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "website" VARCHAR(500),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venues_org_id_idx" ON "venues"("org_id");
CREATE INDEX "venues_city_idx" ON "venues"("city");
CREATE INDEX "venues_org_id_name_idx" ON "venues"("org_id", "name");

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Tournaments - Add venueId
ALTER TABLE "tournaments" ADD COLUMN "venue_id" TEXT;

-- CreateIndex
CREATE INDEX "tournaments_venue_id_idx" ON "tournaments"("venue_id");

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Payouts - Add orgId and playerName for cross-tournament queries
ALTER TABLE "payouts" ADD COLUMN "org_id" TEXT;
ALTER TABLE "payouts" ADD COLUMN "player_name" TEXT;

-- Backfill orgId from tournaments (for existing payouts)
UPDATE "payouts" p
SET "org_id" = t."org_id"
FROM "tournaments" t
WHERE p."tournament_id" = t."id"
AND p."org_id" IS NULL;

-- Backfill playerName from players (for existing payouts)
UPDATE "payouts" p
SET "player_name" = pl."name"
FROM "players" pl
WHERE p."player_id" = pl."id"
AND p."player_name" IS NULL;

-- Make columns NOT NULL after backfill
ALTER TABLE "payouts" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "payouts" ALTER COLUMN "player_name" SET NOT NULL;

-- CreateIndex
CREATE INDEX "payouts_org_id_idx" ON "payouts"("org_id");
CREATE INDEX "payouts_org_id_player_name_idx" ON "payouts"("org_id", "player_name");
