CREATE TYPE "public"."project_section_kind" AS ENUM('hero', 'chapter', 'closing');--> statement-breakpoint
CREATE TABLE "project_sections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_sections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"position" integer NOT NULL,
	"kind" "project_section_kind" NOT NULL,
	"title" varchar(255),
	"body" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_sections_position_unique" UNIQUE("position")
);--> statement-breakpoint
INSERT INTO "project_sections" ("position", "kind", "title", "body") VALUES
	(1, 'hero', 'Soy Droopy Manuel', '{}'),
	(2, 'chapter', NULL, ARRAY['Llegué a esta familia cuando tenía apenas 2 meses. Fui un regalo lleno de intención y amor.', 'Viví mis primeros años rodeado de familia, risas y hogar. Pero desde el principio, una de mis humanas y yo creamos un vínculo muy especial.']),
	(3, 'chapter', '🐾 Nuestro camino juntos', ARRAY['Cuando llegó el momento de que ella empezara una nueva etapa en su vida, me llevó con ella.', 'Y así comenzamos nuestro camino juntos.']),
	(4, 'chapter', '🌱 Crecimos juntos', ARRAY['Mientras yo aprendía rutinas nuevas, ella aprendía a organizar su vida.', 'En una etapa donde todo eran fiestas y llegar tarde, mi cuidado se convirtió en responsabilidad. Mi bienestar se volvió motivo para trabajar, madurar y construir un futuro.', '**No fui solo su perro. Fui parte de su crecimiento.**']),
	(5, 'chapter', '💛 Trece años de amor', ARRAY['Vivimos 13 años llenos de amor profundo. Y el 14 de febrero de 2025 crucé el arcoíris.', 'Mi partida fue rápida. Y el vacío… muy grande.']),
	(6, 'chapter', '⭐ La historia se hizo propósito', ARRAY['Pero mis humanas decidieron que mi historia no terminaría en tristeza.', 'La transformaron en propósito. **Así nació este proyecto.** No desde la lástima, sino desde el amor consciente y la responsabilidad: cada regalo que nace en mi nombre ayuda a mejorar el bienestar de perritos comunitarios y callejeritos.', 'Existe una tienda y cada compra apoya directamente a la manada comunitaria.', 'El sistema de estrellas permite que la ayuda sea constante y sostenible, sin necesidad de exponer el dolor, sino fortaleciendo a quienes ya cuidan y acompañan.', 'Quindi Estampados impulsa y financia este proyecto, porque también fue parte de mi historia desde el principio.']),
	(7, 'closing', NULL, ARRAY['Hoy sigo aquí. En cada estrella que se enciende, en cada gesto que mejora la vida de otro perrito, en cada decisión de amar con responsabilidad.', '**Porque el amor verdadero no termina, se transforma en propósito.**', 'Y si estás leyendo esto… ya haces parte de mi manada 🐾✨']);
