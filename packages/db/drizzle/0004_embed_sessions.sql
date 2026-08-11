CREATE TABLE "embed_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"origin" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "embed_sessions_config_id_embed_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."embed_configs"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "embed_sessions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "embed_sessions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "embed_sessions_token_hash_uidx" ON "embed_sessions" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "embed_sessions_config_idx" ON "embed_sessions" USING btree ("config_id");
--> statement-breakpoint
CREATE INDEX "embed_sessions_org_agent_idx" ON "embed_sessions" USING btree ("org_id","agent_id");
--> statement-breakpoint
CREATE INDEX "embed_sessions_expires_idx" ON "embed_sessions" USING btree ("expires_at");
