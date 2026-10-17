CREATE TYPE "public"."dog_news_kind" AS ENUM('general', 'examen', 'tratamiento', 'cirugia', 'recuperacion');--> statement-breakpoint
CREATE TABLE "dog_news" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dog_news_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"dog_slug" varchar(120) NOT NULL,
	"kind" "dog_news_kind" DEFAULT 'general' NOT NULL,
	"title" varchar(160) NOT NULL,
	"body" text NOT NULL,
	"date" varchar(10) NOT NULL,
	"photo" varchar(255),
	"urgent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dog_news" ADD CONSTRAINT "dog_news_dog_slug_dogs_slug_fk" FOREIGN KEY ("dog_slug") REFERENCES "public"."dogs"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "dog_news_dog_idx" ON "dog_news" USING btree ("dog_slug");--> statement-breakpoint
CREATE INDEX "dog_news_date_idx" ON "dog_news" USING btree ("date");
