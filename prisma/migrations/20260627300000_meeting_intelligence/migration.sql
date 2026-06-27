-- Meeting intelligence: scheduling, outcomes, calendar sync, reminders

CREATE TYPE "MeetingType" AS ENUM ('VIRTUAL', 'IN_PERSON', 'HYBRID');
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "MeetingOutcome" AS ENUM ('PENDING', 'SUCCESSFUL', 'PARTIAL', 'UNSUCCESSFUL');
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'OUTLOOK', 'MANUAL');

ALTER TABLE "meetings" ADD COLUMN "ai_evaluation" TEXT;
ALTER TABLE "meetings" ADD COLUMN "ends_at" TIMESTAMP(3);
ALTER TABLE "meetings" ADD COLUMN "duration_minutes" INTEGER;
ALTER TABLE "meetings" ADD COLUMN "type" "MeetingType" NOT NULL DEFAULT 'VIRTUAL';
ALTER TABLE "meetings" ADD COLUMN "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED';
ALTER TABLE "meetings" ADD COLUMN "meeting_url" TEXT;
ALTER TABLE "meetings" ADD COLUMN "location" TEXT;
ALTER TABLE "meetings" ADD COLUMN "outcome_report" TEXT;
ALTER TABLE "meetings" ADD COLUMN "outcome" "MeetingOutcome" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "meetings" ADD COLUMN "external_source" TEXT;
ALTER TABLE "meetings" ADD COLUMN "external_id" TEXT;
ALTER TABLE "meetings" ADD COLUMN "external_participants" JSONB;

CREATE UNIQUE INDEX "meetings_external_source_external_id_key" ON "meetings"("external_source", "external_id");
CREATE INDEX "meetings_scheduled_at_idx" ON "meetings"("scheduled_at");
CREATE INDEX "meetings_status_idx" ON "meetings"("status");

ALTER TABLE "reminders" ADD COLUMN "meeting_id" TEXT;
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "reminders_meeting_id_idx" ON "reminders"("meeting_id");

ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "calendar_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "calendar_id" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "calendar_connections_user_id_provider_key" ON "calendar_connections"("user_id", "provider");
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
