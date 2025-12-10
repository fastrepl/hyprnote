CREATE TABLE "roadmap_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" text NOT NULL,
	"description" text,
	"status" text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done')),
	"labels" text[] DEFAULT '{}',
	"github_issues" text[] DEFAULT '{}',
	"created_at" timestamptz DEFAULT now(),
	"updated_at" timestamptz DEFAULT now()
);

CREATE TABLE "roadmap_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
	"roadmap_item_id" uuid NOT NULL REFERENCES "roadmap_items"("id") ON DELETE CASCADE,
	"created_at" timestamptz DEFAULT now(),
	UNIQUE("user_id", "roadmap_item_id")
);

ALTER TABLE "roadmap_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roadmap_votes" ENABLE ROW LEVEL SECURITY;

CREATE INDEX "roadmap_items_status_idx" ON "roadmap_items" ("status");
CREATE INDEX "roadmap_votes_roadmap_item_id_idx" ON "roadmap_votes" ("roadmap_item_id");
CREATE INDEX "roadmap_votes_user_id_idx" ON "roadmap_votes" ("user_id");

CREATE POLICY "roadmap_items_select_all" ON "roadmap_items" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);

CREATE POLICY "roadmap_items_service_all" ON "roadmap_items" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);

CREATE POLICY "roadmap_votes_select_own" ON "roadmap_votes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = user_id);

CREATE POLICY "roadmap_votes_insert_own" ON "roadmap_votes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "roadmap_votes_delete_own" ON "roadmap_votes" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = user_id);

CREATE POLICY "roadmap_votes_service_all" ON "roadmap_votes" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_roadmap_vote_counts()
RETURNS TABLE (roadmap_item_id uuid, vote_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT rv.roadmap_item_id, COUNT(*)::bigint as vote_count
  FROM roadmap_votes rv
  GROUP BY rv.roadmap_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
