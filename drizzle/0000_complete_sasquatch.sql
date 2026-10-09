CREATE TYPE "public"."admin_role" AS ENUM('admin', 'editor');--> statement-breakpoint
CREATE TYPE "public"."dog_energy" AS ENUM('tranquilo', 'moderado', 'juguetón');--> statement-breakpoint
CREATE TYPE "public"."dog_sex" AS ENUM('macho', 'hembra');--> statement-breakpoint
CREATE TYPE "public"."dog_size" AS ENUM('pequeño', 'mediano', 'grande');--> statement-breakpoint
CREATE TYPE "public"."dog_status" AS ENUM('en-adopcion', 'hogar-temporal', 'adoptado', 'en-memoria');--> statement-breakpoint
CREATE TYPE "public"."news_category" AS ENUM('rescate', 'adopcion', 'salud', 'evento', 'tienda');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('transferencia', 'billetera', 'internacional');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('sin-pago', 'en-revision', 'pagado', 'rechazado');--> statement-breakpoint
CREATE TYPE "public"."shipping_id" AS ENUM('recogida', 'domicilio');--> statement-breakpoint
CREATE TABLE "dogs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dogs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"breed" varchar(120) NOT NULL,
	"age_years" integer NOT NULL,
	"age_label" varchar(60) NOT NULL,
	"sex" "dog_sex" NOT NULL,
	"size" "dog_size" NOT NULL,
	"energy" "dog_energy" NOT NULL,
	"good_with_kids" boolean DEFAULT false NOT NULL,
	"good_with_dogs" boolean DEFAULT false NOT NULL,
	"good_with_cats" boolean DEFAULT false NOT NULL,
	"vaccinated" boolean DEFAULT false NOT NULL,
	"sterilized" boolean DEFAULT false NOT NULL,
	"status" "dog_status" NOT NULL,
	"arrival" varchar(10) NOT NULL,
	"traits" text[] DEFAULT '{}' NOT NULL,
	"story" text NOT NULL,
	"photo" varchar(255),
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dogs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "shop_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shop_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"emoji" varchar(16) NOT NULL,
	"blurb" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "shop_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shop_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(120) NOT NULL,
	"name" varchar(160) NOT NULL,
	"category_slug" varchar(120) NOT NULL,
	"price_cents" integer NOT NULL,
	"description" text NOT NULL,
	"details" text NOT NULL,
	"photo" varchar(255),
	"emoji" varchar(16) NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_items_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "shop_variants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shop_variants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"item_slug" varchar(120) NOT NULL,
	"variant_id" varchar(60) NOT NULL,
	"label" varchar(120) NOT NULL,
	"price_cents" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"sku" varchar(60),
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "shop_variants_item_variant_unique" UNIQUE("item_slug","variant_id")
);
--> statement-breakpoint
CREATE TABLE "contact_channels" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contact_channels_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"key" varchar(60) NOT NULL,
	"label" varchar(120) NOT NULL,
	"icon" varchar(255) NOT NULL,
	"href" text NOT NULL,
	"phone_number" varchar(30),
	"phone_display" varchar(40),
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "contact_channels_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "order_lines" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_lines_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"item_slug" varchar(120) NOT NULL,
	"variant_id" varchar(60),
	"name" varchar(255) NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"total_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_number" varchar(32) NOT NULL,
	"customer_nombres" varchar(120) NOT NULL,
	"customer_apellidos" varchar(120) NOT NULL,
	"customer_pais" varchar(120) NOT NULL,
	"customer_direccion" text NOT NULL,
	"customer_ciudad" varchar(120) NOT NULL,
	"customer_telefono" varchar(60) NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"customer_notas" text,
	"subtotal_cents" integer NOT NULL,
	"shipping_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"shipping" "shipping_id" NOT NULL,
	"shipping_label" varchar(120) NOT NULL,
	"status" "order_status" DEFAULT 'pendiente' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'sin-pago' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" varchar(60) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "news_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(160) NOT NULL,
	"title" varchar(255) NOT NULL,
	"excerpt" text NOT NULL,
	"body" text[] DEFAULT '{}' NOT NULL,
	"date" varchar(10) NOT NULL,
	"category" "news_category" NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"photo" varchar(255),
	"emoji" varchar(16) NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "news_related_dogs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "news_related_dogs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"news_slug" varchar(160) NOT NULL,
	"dog_slug" varchar(120) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bank_accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"bank" varchar(160) NOT NULL,
	"emoji" varchar(16) NOT NULL,
	"method" "payment_method" NOT NULL,
	"holder" varchar(255) NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donation_targets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "donation_targets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"dog_slug" varchar(120) NOT NULL,
	"goal_cents" integer,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "donation_targets_dog_slug_unique" UNIQUE("dog_slug")
);
--> statement-breakpoint
CREATE TABLE "donation_tiers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "donation_tiers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"stars" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" varchar(8) DEFAULT 'COP' NOT NULL,
	"blurb" text NOT NULL,
	"perks" text[] DEFAULT '{}' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "donation_tiers_stars_unique" UNIQUE("stars")
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "testimonials_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(160) NOT NULL,
	"role" varchar(160) NOT NULL,
	"quote" text NOT NULL,
	"dog_slug" varchar(120),
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer,
	"entity" varchar(60) NOT NULL,
	"entity_key" varchar(160) NOT NULL,
	"action" varchar(20) NOT NULL,
	"before" text,
	"after" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"token_hash" varchar(128) NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(160) NOT NULL,
	"role" "admin_role" DEFAULT 'editor' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "shop_items" ADD CONSTRAINT "shop_items_category_slug_shop_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."shop_categories"("slug") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "shop_variants" ADD CONSTRAINT "shop_variants_item_slug_shop_items_slug_fk" FOREIGN KEY ("item_slug") REFERENCES "public"."shop_items"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_related_dogs" ADD CONSTRAINT "news_related_dogs_news_slug_news_slug_fk" FOREIGN KEY ("news_slug") REFERENCES "public"."news"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "news_related_dogs" ADD CONSTRAINT "news_related_dogs_dog_slug_dogs_slug_fk" FOREIGN KEY ("dog_slug") REFERENCES "public"."dogs"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "donation_targets" ADD CONSTRAINT "donation_targets_dog_slug_dogs_slug_fk" FOREIGN KEY ("dog_slug") REFERENCES "public"."dogs"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_dog_slug_dogs_slug_fk" FOREIGN KEY ("dog_slug") REFERENCES "public"."dogs"("slug") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dogs_status_idx" ON "dogs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dogs_featured_idx" ON "dogs" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "dogs_sort_idx" ON "dogs" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "shop_items_category_idx" ON "shop_items" USING btree ("category_slug");--> statement-breakpoint
CREATE INDEX "shop_items_featured_idx" ON "shop_items" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "shop_variants_item_idx" ON "shop_variants" USING btree ("item_slug");--> statement-breakpoint
CREATE INDEX "order_lines_order_idx" ON "order_lines" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_email_idx" ON "orders" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_payment_idx" ON "orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "news_date_idx" ON "news" USING btree ("date");--> statement-breakpoint
CREATE INDEX "news_category_idx" ON "news" USING btree ("category");--> statement-breakpoint
CREATE INDEX "news_related_news_idx" ON "news_related_dogs" USING btree ("news_slug");--> statement-breakpoint
CREATE INDEX "admin_audit_entity_idx" ON "admin_audit_log" USING btree ("entity","entity_key");--> statement-breakpoint
CREATE INDEX "admin_audit_created_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_sessions_user_idx" ON "admin_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_sessions_expires_idx" ON "admin_sessions" USING btree ("expires_at");