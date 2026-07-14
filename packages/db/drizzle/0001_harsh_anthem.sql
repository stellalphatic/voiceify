CREATE TYPE "public"."platform_role" AS ENUM('user', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('pending', 'approved', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."org_status" AS ENUM('active', 'suspended');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "status" "user_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "platformRole" "platform_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "status" "org_status" DEFAULT 'active' NOT NULL;