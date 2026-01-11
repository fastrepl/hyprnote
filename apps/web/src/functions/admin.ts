import { createServerFn } from "@tanstack/react-start";

import { getSupabaseServerClient } from "@/functions/supabase";

const ADMIN_EMAILS = [
  "yujonglee@hyprnote.com",
  "john@hyprnote.com",
  "marketing@hyprnote.com",
];

export const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

export const fetchAdminUser = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { data, error: _error } = await supabase.auth.getUser();

    if (!data.user?.email) {
      return null;
    }

    const email = data.user.email;
    const isAdmin = isAdminEmail(email);

    return {
      email,
      isAdmin,
    };
  },
);
