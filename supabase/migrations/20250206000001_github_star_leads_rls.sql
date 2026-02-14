ALTER TABLE public.github_star_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "github_star_leads_service_all" ON public.github_star_leads AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
