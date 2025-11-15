CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL
);

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE POLICY "profiles_select_owner" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("profiles"."id" = auth.uid());

CREATE POLICY "profiles_insert_owner" ON "profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("profiles"."id" = auth.uid());

CREATE POLICY "profiles_update_owner" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("profiles"."id" = auth.uid()) WITH CHECK ("profiles"."id" = auth.uid());

CREATE POLICY "profiles_delete_owner" ON "profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("profiles"."id" = auth.uid());

CREATE POLICY "profiles_service_all" ON "profiles" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);

