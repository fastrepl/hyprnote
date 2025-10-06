import { createClient, processLock, type SupportedStorage } from "@supabase/supabase-js";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { env } from "./env";

const storage = null as unknown as SupportedStorage;

export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

const appWindow = getCurrentWindow();

appWindow.listen("tauri://focus", () => {
  supabase.auth.startAutoRefresh();
});

appWindow.listen("tauri://blur", () => {
  supabase.auth.stopAutoRefresh();
});
