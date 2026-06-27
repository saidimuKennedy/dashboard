-- Decision phase tracking: status history, review reminders

CREATE TABLE "decision_status_history" (
    "id" TEXT NOT NULL,
    "decision_id" TEXT NOT NULL,
    "from_status" "DecisionStatus",
    "to_status" "DecisionStatus" NOT NULL,
    "changed_by" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_status_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "decision_status_history" ADD CONSTRAINT "decision_status_history_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "decision_status_history" ADD CONSTRAINT "decision_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "decision_status_history_decision_id_created_at_idx" ON "decision_status_history"("decision_id", "created_at");
CREATE INDEX "decisions_review_date_idx" ON "decisions"("review_date");

ALTER TABLE "reminders" ADD COLUMN "decision_id" TEXT;
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "reminders_decision_id_idx" ON "reminders"("decision_id");

-- Seed initial history for existing decisions
INSERT INTO "decision_status_history" ("id", "decision_id", "from_status", "to_status", "created_at")
SELECT
    gen_random_uuid()::text,
    "id",
    NULL,
    "status",
    "created_at"
FROM "decisions"
WHERE "deleted_at" IS NULL;
