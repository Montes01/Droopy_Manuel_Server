ALTER TABLE "dogs" DROP COLUMN "age_years";
ALTER TABLE "dogs" DROP COLUMN "age_label";
ALTER TABLE "dogs" ADD COLUMN "birth_date" varchar(10);
ALTER TABLE "dogs" ADD COLUMN "is_approx" boolean NOT NULL DEFAULT false;