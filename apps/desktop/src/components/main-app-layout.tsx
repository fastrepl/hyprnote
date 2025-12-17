import { Outlet, useNavigate } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect } from "react";

import { events as deeplink2Events } from "@hypr/plugin-deeplink2";
import { events as windowsEvents } from "@hypr/plugin-windows";

import { AuthProvider } from "../auth";
import { BillingProvider } from "../billing";
import { useTabs } from "../store/zustand/tabs";

/**
 * Main app layout component that wraps routes with auth/billing providers.
 * This is loaded dynamically to prevent auth.tsx from being imported in iframe context.
 * auth.tsx creates Supabase client at module level which uses Tauri APIs that aren't
 * available in iframes.
 */
export default function MainAppLayout() {
  useNavigationEvents();

  return (
    <AuthProvider>
      <BillingProvider>
        <Outlet />
      </BillingProvider>
    </AuthProvider>
  );
}

const useNavigationEvents = () => {
  const navigate = useNavigate();
  const openNew = useTabs((state) => state.openNew);

  useEffect(() => {
    let unlistenNavigate: (() => void) | undefined;
    let unlistenDeepLink: (() => void) | undefined;
    let unlistenOpenTab: (() => void) | undefined;

    const webview = getCurrentWebviewWindow();

    void windowsEvents
      .navigate(webview)
      .listen(({ payload }) => {
        if (payload.path === "/app/settings") {
          let tab = (payload.search?.tab as string) ?? "general";
          if (tab === "notifications" || tab === "account") {
            tab = "general";
          }
          if (tab === "calendar") {
            openNew({ type: "calendar" });
          } else if (tab === "transcription" || tab === "intelligence") {
            openNew({
              type: "ai",
              state: {
                tab: tab as "transcription" | "intelligence",
              },
            });
          } else {
            openNew({ type: "settings" });
          }
        } else {
          void navigate({
            to: payload.path,
            search: payload.search ?? undefined,
          });
        }
      })
      .then((fn) => {
        unlistenNavigate = fn;
      });

    void windowsEvents
      .openTab(webview)
      .listen(({ payload }) => {
        openNew(payload.tab);
      })
      .then((fn) => {
        unlistenOpenTab = fn;
      });

    void deeplink2Events.deepLinkEvent
      .listen(({ payload }) => {
        void navigate({ to: payload.to, search: payload.search });
      })
      .then((fn) => {
        unlistenDeepLink = fn;
      });

    return () => {
      unlistenNavigate?.();
      unlistenOpenTab?.();
      unlistenDeepLink?.();
    };
  }, [navigate, openNew]);
};
