ALTER TABLE "ro" ADD COLUMN "parent_ro_id" UUID;

CREATE UNIQUE INDEX "ro_parent_ro_id_key" ON "ro"("parent_ro_id");
CREATE INDEX "ro_parent_ro_id_idx" ON "ro"("parent_ro_id");

ALTER TABLE "ro"
  ADD CONSTRAINT "ro_parent_ro_id_fkey"
  FOREIGN KEY ("parent_ro_id") REFERENCES "ro"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
