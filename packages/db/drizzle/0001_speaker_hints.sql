CREATE TABLE "speaker_hints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "transcript_id" uuid NOT NULL,
  "word_id" uuid NOT NULL,
  "type" text NOT NULL,
  "value" json NOT NULL
);
--> statement-breakpoint
ALTER TABLE
  "speaker_hints" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE
  "speaker_hints"
ADD
  CONSTRAINT "speaker_hints_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "speaker_hints"
ADD
  CONSTRAINT "speaker_hints_transcript_id_transcripts_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."transcripts"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "speaker_hints"
ADD
  CONSTRAINT "speaker_hints_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
CREATE POLICY "speaker_hints_select_owner" ON "speaker_hints" AS PERMISSIVE FOR
SELECT
  TO "authenticated" USING ("speaker_hints"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "speaker_hints_insert_owner" ON "speaker_hints" AS PERMISSIVE FOR
INSERT
  TO "authenticated" WITH CHECK ("speaker_hints"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "speaker_hints_update_owner" ON "speaker_hints" AS PERMISSIVE FOR
UPDATE
  TO "authenticated" USING ("speaker_hints"."user_id" = auth.uid()) WITH CHECK ("speaker_hints"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "speaker_hints_delete_owner" ON "speaker_hints" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("speaker_hints"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "speaker_hints_service_all" ON "speaker_hints" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
