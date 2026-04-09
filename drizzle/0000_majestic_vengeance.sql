CREATE SCHEMA "shell";
--> statement-breakpoint
CREATE SCHEMA "app01";
--> statement-breakpoint
CREATE TABLE "shell"."user_app_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"app_id" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_app_access_user_id_app_id_unique" UNIQUE("user_id","app_id")
);
--> statement-breakpoint
CREATE TABLE "app01"."entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"entry_date" date NOT NULL,
	"note_text" text,
	"mood_score" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entries_user_id_entry_date_unique" UNIQUE("user_id","entry_date"),
	CONSTRAINT "mood_score_range" CHECK ("app01"."entries"."mood_score" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "app01"."user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"reminder_enabled" boolean DEFAULT false NOT NULL,
	"reminder_time" time,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "entries_user_date_idx" ON "app01"."entries" USING btree ("user_id","entry_date");