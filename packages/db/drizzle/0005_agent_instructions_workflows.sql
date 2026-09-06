ALTER TABLE "agents"
ADD COLUMN IF NOT EXISTS "instructions" text DEFAULT '' NOT NULL;

DO $$ BEGIN
  CREATE TYPE "public"."workflow_status" AS ENUM('draft', 'active');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "workflows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "agent_id" uuid NOT NULL,
  "name" text DEFAULT 'Conversation flow' NOT NULL,
  "status" "workflow_status" DEFAULT 'draft' NOT NULL,
  "graph" jsonb DEFAULT '{"nodes":[],"edges":[]}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "workflows_org_id_organizations_id_fk"
    FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id")
    ON DELETE cascade,
  CONSTRAINT "workflows_agent_id_agents_id_fk"
    FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id")
    ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "workflows_org_agent_uidx"
ON "workflows" USING btree ("org_id", "agent_id");

CREATE INDEX IF NOT EXISTS "workflows_org_status_idx"
ON "workflows" USING btree ("org_id", "status");
