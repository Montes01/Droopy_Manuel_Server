CREATE TABLE "dog_accessories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dog_accessories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"dog_slug" varchar(120) NOT NULL,
	"label" varchar(120) NOT NULL,
	"value" varchar(160),
	"provided" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dog_health" (
	"dog_slug" varchar(120) PRIMARY KEY NOT NULL,
	"last_bath" varchar(10),
	"next_bath" varchar(10),
	"vet_visit_done" boolean DEFAULT false NOT NULL,
	"vet_visit_date" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dog_vaccines" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dog_vaccines_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"dog_slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"applied" boolean DEFAULT false NOT NULL,
	"applied_date" varchar(10),
	"recommendation" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dog_accessories" ADD CONSTRAINT "dog_accessories_dog_slug_dogs_slug_fk" FOREIGN KEY ("dog_slug") REFERENCES "public"."dogs"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "dog_health" ADD CONSTRAINT "dog_health_dog_slug_dogs_slug_fk" FOREIGN KEY ("dog_slug") REFERENCES "public"."dogs"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "dog_vaccines" ADD CONSTRAINT "dog_vaccines_dog_slug_dogs_slug_fk" FOREIGN KEY ("dog_slug") REFERENCES "public"."dogs"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "dog_accessories_dog_idx" ON "dog_accessories" USING btree ("dog_slug");--> statement-breakpoint
CREATE INDEX "dog_vaccines_dog_idx" ON "dog_vaccines" USING btree ("dog_slug");--> statement-breakpoint
ALTER TABLE "dogs" DROP COLUMN IF EXISTS "vaccinated";