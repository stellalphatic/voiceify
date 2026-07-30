ALTER TABLE "knowledge_docs" ADD COLUMN "agent_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;
