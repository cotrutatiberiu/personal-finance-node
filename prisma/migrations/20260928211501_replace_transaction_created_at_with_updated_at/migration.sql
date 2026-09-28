-- occurred_at is server-set once at creation, so created_at duplicated it.
-- updated_at records the last edit; seed it from created_at so existing rows keep a real timestamp.
ALTER TABLE "transactions" ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "transactions" SET "updated_at" = "created_at";

ALTER TABLE "transactions" DROP COLUMN "created_at";
