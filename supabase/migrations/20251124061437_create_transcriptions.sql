CREATE TABLE "transcriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_size" bigint NOT NULL,
	"status" text NOT NULL DEFAULT 'pending',
	"progress" integer NOT NULL DEFAULT 0,
	"transcript" text,
	"error" text,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "transcriptions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "transcriptions" ADD CONSTRAINT "transcriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE POLICY "transcriptions_select_owner" ON "transcriptions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("transcriptions"."user_id" = auth.uid());

CREATE POLICY "transcriptions_insert_owner" ON "transcriptions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("transcriptions"."user_id" = auth.uid());

CREATE POLICY "transcriptions_update_owner" ON "transcriptions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("transcriptions"."user_id" = auth.uid()) WITH CHECK ("transcriptions"."user_id" = auth.uid());

CREATE POLICY "transcriptions_delete_owner" ON "transcriptions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("transcriptions"."user_id" = auth.uid());

CREATE POLICY "transcriptions_service_all" ON "transcriptions" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
