CREATE TABLE "billings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	"stripe_customer" jsonb,
	"stripe_subscription" jsonb
);

ALTER TABLE "billings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "billings" ADD CONSTRAINT "billings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "billings_user_id_key" ON "billings" ("user_id");

CREATE POLICY "billings_select_owner" ON "billings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("billings"."user_id" = auth.uid());

CREATE POLICY "billings_insert_owner" ON "billings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("billings"."user_id" = auth.uid());

CREATE POLICY "billings_update_owner" ON "billings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("billings"."user_id" = auth.uid()) WITH CHECK ("billings"."user_id" = auth.uid());

CREATE POLICY "billings_delete_owner" ON "billings" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("billings"."user_id" = auth.uid());

CREATE POLICY "billings_service_all" ON "billings" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);

