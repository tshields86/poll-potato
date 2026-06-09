CREATE TABLE "poll" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"question" text NOT NULL,
	"creator_user_id" uuid,
	"creator_token" text,
	"allow_multiple" boolean DEFAULT false NOT NULL,
	"require_name" boolean DEFAULT false NOT NULL,
	"hide_results" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"closes_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poll_slug_unique" UNIQUE("slug"),
	CONSTRAINT "poll_status_check" CHECK ("poll"."status" in ('open', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "poll_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"user_id" uuid,
	"voter_token" text,
	"voter_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "poll_option" ADD CONSTRAINT "poll_option_poll_id_poll_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."poll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_poll_id_poll_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."poll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_option_id_poll_option_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."poll_option"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "poll_creator_user_id_idx" ON "poll" USING btree ("creator_user_id");--> statement-breakpoint
CREATE INDEX "poll_creator_token_idx" ON "poll" USING btree ("creator_token");--> statement-breakpoint
CREATE INDEX "poll_option_poll_id_position_idx" ON "poll_option" USING btree ("poll_id","position");--> statement-breakpoint
CREATE INDEX "vote_poll_id_idx" ON "vote" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "vote_option_id_idx" ON "vote" USING btree ("option_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vote_unique_user_option" ON "vote" USING btree ("poll_id","user_id","option_id") WHERE "vote"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "vote_unique_token_option" ON "vote" USING btree ("poll_id","voter_token","option_id") WHERE "vote"."voter_token" is not null;