ALTER TABLE "bestellkunde"
ADD COLUMN "email" VARCHAR(150);

UPDATE "bestellkunde"
SET "email" = CONCAT('legacy-', "bestellkunde_id", '@example.invalid')
WHERE "email" IS NULL;

ALTER TABLE "bestellkunde"
ALTER COLUMN "email" SET NOT NULL;
