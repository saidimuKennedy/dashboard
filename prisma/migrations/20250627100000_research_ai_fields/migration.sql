-- AlterTable
ALTER TABLE "research_topics" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "research_topics" ADD COLUMN IF NOT EXISTS "source_chat" JSONB;
ALTER TABLE "research_topics" ADD COLUMN IF NOT EXISTS "ai_analysis" JSONB;

-- Widen notes column for full chat transcripts (no-op if already TEXT)
ALTER TABLE "research_topics" ALTER COLUMN "notes" SET DATA TYPE TEXT;
