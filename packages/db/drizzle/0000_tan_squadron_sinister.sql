CREATE TABLE "calendars" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE
  "calendars" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "chat_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "title" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE
  "chat_groups" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "chat_group_id" uuid NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "metadata" json,
  "parts" json
);
--> statement-breakpoint
ALTER TABLE
  "chat_messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "calendar_id" uuid NOT NULL,
  "title" text NOT NULL,
  "started_at" timestamp NOT NULL,
  "ended_at" timestamp NOT NULL,
  "location" text,
  "meeting_link" text,
  "description" text,
  "note" text
);
--> statement-breakpoint
ALTER TABLE
  "events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "folders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "name" text NOT NULL,
  "parent_folder_id" uuid
);
--> statement-breakpoint
ALTER TABLE
  "folders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "humans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "org_id" uuid NOT NULL,
  "job_title" text,
  "linkedin_username" text
);
--> statement-breakpoint
ALTER TABLE
  "humans" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "mapping_session_participant" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "session_id" uuid NOT NULL,
  "human_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE
  "mapping_session_participant" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "mapping_tag_session" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "tag_id" uuid NOT NULL,
  "session_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE
  "mapping_tag_session" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE
  "organizations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "folder_id" uuid,
  "event_id" uuid,
  "title" text NOT NULL,
  "raw_md" text NOT NULL,
  "enhanced_md" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE
  "sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE
  "tags" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "sections" json NOT NULL
);
--> statement-breakpoint
ALTER TABLE
  "templates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "transcripts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "session_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE
  "transcripts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "words" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "transcript_id" uuid NOT NULL,
  "text" text NOT NULL,
  "start_ms" integer NOT NULL,
  "end_ms" integer NOT NULL,
  "channel" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE
  "words" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE
  "calendars"
ADD
  CONSTRAINT "calendars_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "chat_groups"
ADD
  CONSTRAINT "chat_groups_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "chat_messages"
ADD
  CONSTRAINT "chat_messages_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "chat_messages"
ADD
  CONSTRAINT "chat_messages_chat_group_id_chat_groups_id_fk" FOREIGN KEY ("chat_group_id") REFERENCES "public"."chat_groups"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "events"
ADD
  CONSTRAINT "events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "events"
ADD
  CONSTRAINT "events_calendar_id_calendars_id_fk" FOREIGN KEY ("calendar_id") REFERENCES "public"."calendars"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "folders"
ADD
  CONSTRAINT "folders_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "folders"
ADD
  CONSTRAINT "folders_parent_folder_id_folders_id_fk" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "mapping_session_participant"
ADD
  CONSTRAINT "mapping_session_participant_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "mapping_session_participant"
ADD
  CONSTRAINT "mapping_session_participant_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "mapping_session_participant"
ADD
  CONSTRAINT "mapping_session_participant_human_id_humans_id_fk" FOREIGN KEY ("human_id") REFERENCES "public"."humans"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "mapping_tag_session"
ADD
  CONSTRAINT "mapping_tag_session_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "mapping_tag_session"
ADD
  CONSTRAINT "mapping_tag_session_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "mapping_tag_session"
ADD
  CONSTRAINT "mapping_tag_session_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "organizations"
ADD
  CONSTRAINT "organizations_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "sessions"
ADD
  CONSTRAINT "sessions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "sessions"
ADD
  CONSTRAINT "sessions_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "tags"
ADD
  CONSTRAINT "tags_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "templates"
ADD
  CONSTRAINT "templates_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "transcripts"
ADD
  CONSTRAINT "transcripts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "transcripts"
ADD
  CONSTRAINT "transcripts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "words"
ADD
  CONSTRAINT "words_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
ALTER TABLE
  "words"
ADD
  CONSTRAINT "words_transcript_id_transcripts_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."transcripts"("id") ON DELETE cascade ON
UPDATE
  no action;
--> statement-breakpoint
CREATE POLICY "calendars_select_owner" ON "calendars" AS PERMISSIVE FOR
SELECT
  TO "authenticated" USING ("calendars"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "calendars_insert_owner" ON "calendars" AS PERMISSIVE FOR
INSERT
  TO "authenticated" WITH CHECK ("calendars"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "calendars_update_owner" ON "calendars" AS PERMISSIVE FOR
UPDATE
  TO "authenticated" USING ("calendars"."user_id" = auth.uid()) WITH CHECK ("calendars"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "calendars_delete_owner" ON "calendars" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("calendars"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "calendars_service_all" ON "calendars" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "chat_groups_select_owner" ON "chat_groups" AS PERMISSIVE FOR
SELECT
  TO "authenticated" USING ("chat_groups"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "chat_groups_insert_owner" ON "chat_groups" AS PERMISSIVE FOR
INSERT
  TO "authenticated" WITH CHECK ("chat_groups"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "chat_groups_update_owner" ON "chat_groups" AS PERMISSIVE FOR
UPDATE
  TO "authenticated" USING ("chat_groups"."user_id" = auth.uid()) WITH CHECK ("chat_groups"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "chat_groups_delete_owner" ON "chat_groups" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("chat_groups"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "chat_groups_service_all" ON "chat_groups" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "chat_messages_select_owner" ON "chat_messages" AS PERMISSIVE FOR
SELECT
  TO "authenticated" USING ("chat_messages"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "chat_messages_insert_owner" ON "chat_messages" AS PERMISSIVE FOR
INSERT
  TO "authenticated" WITH CHECK ("chat_messages"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "chat_messages_update_owner" ON "chat_messages" AS PERMISSIVE FOR
UPDATE
  TO "authenticated" USING ("chat_messages"."user_id" = auth.uid()) WITH CHECK ("chat_messages"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "chat_messages_delete_owner" ON "chat_messages" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("chat_messages"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "chat_messages_service_all" ON "chat_messages" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "events_select_owner" ON "events" AS PERMISSIVE FOR
SELECT
  TO "authenticated" USING ("events"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "events_insert_owner" ON "events" AS PERMISSIVE FOR
INSERT
  TO "authenticated" WITH CHECK ("events"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "events_update_owner" ON "events" AS PERMISSIVE FOR
UPDATE
  TO "authenticated" USING ("events"."user_id" = auth.uid()) WITH CHECK ("events"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "events_delete_owner" ON "events" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("events"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "events_service_all" ON "events" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "folders_select_owner" ON "folders" AS PERMISSIVE FOR
SELECT
  TO "authenticated" USING ("folders"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "folders_insert_owner" ON "folders" AS PERMISSIVE FOR
INSERT
  TO "authenticated" WITH CHECK ("folders"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "folders_update_owner" ON "folders" AS PERMISSIVE FOR
UPDATE
  TO "authenticated" USING ("folders"."user_id" = auth.uid()) WITH CHECK ("folders"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "folders_delete_owner" ON "folders" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("folders"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "folders_service_all" ON "folders" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "humans_select_owner" ON "humans" AS PERMISSIVE FOR
SELECT
  TO "authenticated" USING ("humans"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "humans_insert_owner" ON "humans" AS PERMISSIVE FOR
INSERT
  TO "authenticated" WITH CHECK ("humans"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "humans_update_owner" ON "humans" AS PERMISSIVE FOR
UPDATE
  TO "authenticated" USING ("humans"."user_id" = auth.uid()) WITH CHECK ("humans"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "humans_delete_owner" ON "humans" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("humans"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "humans_service_all" ON "humans" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "mapping_session_participant_select_owner" ON "mapping_session_participant" AS PERMISSIVE FOR
SELECT
  TO "authenticated" USING (
    "mapping_session_participant"."user_id" = auth.uid()
  );
--> statement-breakpoint
CREATE POLICY "mapping_session_participant_insert_owner" ON "mapping_session_participant" AS PERMISSIVE FOR
INSERT
  TO "authenticated" WITH CHECK (
    "mapping_session_participant"."user_id" = auth.uid()
  );
--> statement-breakpoint
CREATE POLICY "mapping_session_participant_update_owner" ON "mapping_session_participant" AS PERMISSIVE FOR
UPDATE
  TO "authenticated" USING (
    "mapping_session_participant"."user_id" = auth.uid()
  ) WITH CHECK (
    "mapping_session_participant"."user_id" = auth.uid()
  );
--> statement-breakpoint
CREATE POLICY "mapping_session_participant_delete_owner" ON "mapping_session_participant" AS PERMISSIVE FOR DELETE TO "authenticated" USING (
  "mapping_session_participant"."user_id" = auth.uid()
);
--> statement-breakpoint
CREATE POLICY "mapping_session_participant_service_all" ON "mapping_session_participant" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "mapping_tag_session_select_owner" ON "mapping_tag_session" AS PERMISSIVE FOR
SELECT
  TO "authenticated" USING ("mapping_tag_session"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "mapping_tag_session_insert_owner" ON "mapping_tag_session" AS PERMISSIVE FOR
INSERT
  TO "authenticated" WITH CHECK ("mapping_tag_session"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "mapping_tag_session_update_owner" ON "mapping_tag_session" AS PERMISSIVE FOR
UPDATE
  TO "authenticated" USING ("mapping_tag_session"."user_id" = auth.uid()) WITH CHECK ("mapping_tag_session"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "mapping_tag_session_delete_owner" ON "mapping_tag_session" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("mapping_tag_session"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "mapping_tag_session_service_all" ON "mapping_tag_session" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "organizations_select_owner" ON "organizations" AS PERMISSIVE FOR
SELECT
  TO "authenticated" USING ("organizations"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "organizations_insert_owner" ON "organizations" AS PERMISSIVE FOR
INSERT
  TO "authenticated" WITH CHECK ("organizations"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "organizations_update_owner" ON "organizations" AS PERMISSIVE FOR
UPDATE
  TO "authenticated" USING ("organizations"."user_id" = auth.uid()) WITH CHECK ("organizations"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "organizations_delete_owner" ON "organizations" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("organizations"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "organizations_service_all" ON "organizations" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "sessions_select_owner" ON "sessions" AS PERMISSIVE FOR
SELECT
  TO "authenticated" USING ("sessions"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "sessions_insert_owner" ON "sessions" AS PERMISSIVE FOR
INSERT
  TO "authenticated" WITH CHECK ("sessions"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "sessions_update_owner" ON "sessions" AS PERMISSIVE FOR
UPDATE
  TO "authenticated" USING ("sessions"."user_id" = auth.uid()) WITH CHECK ("sessions"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "sessions_delete_owner" ON "sessions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("sessions"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "sessions_service_all" ON "sessions" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "tags_select_owner" ON "tags" AS PERMISSIVE FOR
SELECT
  TO "authenticated" USING ("tags"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "tags_insert_owner" ON "tags" AS PERMISSIVE FOR
INSERT
  TO "authenticated" WITH CHECK ("tags"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "tags_update_owner" ON "tags" AS PERMISSIVE FOR
UPDATE
  TO "authenticated" USING ("tags"."user_id" = auth.uid()) WITH CHECK ("tags"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "tags_delete_owner" ON "tags" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("tags"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "tags_service_all" ON "tags" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "templates_select_owner" ON "templates" AS PERMISSIVE FOR
SELECT
  TO "authenticated" USING ("templates"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "templates_insert_owner" ON "templates" AS PERMISSIVE FOR
INSERT
  TO "authenticated" WITH CHECK ("templates"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "templates_update_owner" ON "templates" AS PERMISSIVE FOR
UPDATE
  TO "authenticated" USING ("templates"."user_id" = auth.uid()) WITH CHECK ("templates"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "templates_delete_owner" ON "templates" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("templates"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "templates_service_all" ON "templates" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "transcripts_select_owner" ON "transcripts" AS PERMISSIVE FOR
SELECT
  TO "authenticated" USING ("transcripts"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "transcripts_insert_owner" ON "transcripts" AS PERMISSIVE FOR
INSERT
  TO "authenticated" WITH CHECK ("transcripts"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "transcripts_update_owner" ON "transcripts" AS PERMISSIVE FOR
UPDATE
  TO "authenticated" USING ("transcripts"."user_id" = auth.uid()) WITH CHECK ("transcripts"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "transcripts_delete_owner" ON "transcripts" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("transcripts"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "transcripts_service_all" ON "transcripts" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "words_select_owner" ON "words" AS PERMISSIVE FOR
SELECT
  TO "authenticated" USING ("words"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "words_insert_owner" ON "words" AS PERMISSIVE FOR
INSERT
  TO "authenticated" WITH CHECK ("words"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "words_update_owner" ON "words" AS PERMISSIVE FOR
UPDATE
  TO "authenticated" USING ("words"."user_id" = auth.uid()) WITH CHECK ("words"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "words_delete_owner" ON "words" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("words"."user_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "words_service_all" ON "words" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
