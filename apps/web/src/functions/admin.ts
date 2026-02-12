import { createServerFn } from "@tanstack/react-start";

import { getSupabaseServerClient } from "@/functions/supabase";

export const fetchAdminUser = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { data, error: _error } = await supabase.auth.getUser();

    if (!data.user?.id || !data.user?.email) {
      return null;
    }

    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("id", data.user.id)
      .single();

    return {
      email: data.user.email,
      isAdmin: !!admin,
    };
  },
);

export const fetchGitHubCredentials = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user?.id) {
      return { hasCredentials: false };
    }

    const { data: admin } = await supabase
      .from("admins")
      .select("github_token, github_username")
      .eq("id", userData.user.id)
      .single();

    const hasCredentials = !!(admin?.github_token && admin?.github_username);

    return { hasCredentials };
  },
);
