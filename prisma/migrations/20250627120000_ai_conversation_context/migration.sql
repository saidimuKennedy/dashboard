ALTER TABLE "ai_conversations" ADD COLUMN IF NOT EXISTS "context_key" TEXT;
CREATE INDEX IF NOT EXISTS "ai_conversations_user_id_context_key_idx" ON "ai_conversations"("user_id", "context_key");
