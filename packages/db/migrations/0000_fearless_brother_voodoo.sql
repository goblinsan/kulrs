CREATE TABLE "colors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"palette_id" uuid NOT NULL,
	"hex_value" varchar(7) NOT NULL,
	"position" integer NOT NULL,
	"name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"palette_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "palette_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"palette_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "palettes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"user_id" uuid NOT NULL,
	"source_id" uuid,
	"is_public" boolean DEFAULT true NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"saves_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"palette_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sources_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" varchar(128) NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"photo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
ALTER TABLE "colors" ADD CONSTRAINT "colors_palette_id_palettes_id_fk" FOREIGN KEY ("palette_id") REFERENCES "public"."palettes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_palette_id_palettes_id_fk" FOREIGN KEY ("palette_id") REFERENCES "public"."palettes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palette_tags" ADD CONSTRAINT "palette_tags_palette_id_palettes_id_fk" FOREIGN KEY ("palette_id") REFERENCES "public"."palettes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palette_tags" ADD CONSTRAINT "palette_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palettes" ADD CONSTRAINT "palettes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "palettes" ADD CONSTRAINT "palettes_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_palette_id_palettes_id_fk" FOREIGN KEY ("palette_id") REFERENCES "public"."palettes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "colors_palette_id_idx" ON "colors" USING btree ("palette_id");--> statement-breakpoint
CREATE INDEX "colors_palette_position_idx" ON "colors" USING btree ("palette_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "likes_user_palette_idx" ON "likes" USING btree ("user_id","palette_id");--> statement-breakpoint
CREATE INDEX "likes_user_id_idx" ON "likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "likes_palette_id_idx" ON "likes" USING btree ("palette_id");--> statement-breakpoint
CREATE UNIQUE INDEX "palette_tags_palette_tag_idx" ON "palette_tags" USING btree ("palette_id","tag_id");--> statement-breakpoint
CREATE INDEX "palette_tags_palette_id_idx" ON "palette_tags" USING btree ("palette_id");--> statement-breakpoint
CREATE INDEX "palette_tags_tag_id_idx" ON "palette_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "palettes_user_id_idx" ON "palettes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "palettes_source_id_idx" ON "palettes" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "palettes_is_public_idx" ON "palettes" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "palettes_created_at_idx" ON "palettes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "palettes_likes_count_idx" ON "palettes" USING btree ("likes_count");--> statement-breakpoint
CREATE UNIQUE INDEX "saves_user_palette_idx" ON "saves" USING btree ("user_id","palette_id");--> statement-breakpoint
CREATE INDEX "saves_user_id_idx" ON "saves" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saves_palette_id_idx" ON "saves" USING btree ("palette_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_name_idx" ON "sources" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_idx" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "users_firebase_uid_idx" ON "users" USING btree ("firebase_uid");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");