import { Outlet, useNavigate } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useCallback, useEffect } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { events as deeplink2Events } from "@hypr/plugin-deeplink2";
import { events as windowsEvents } from "@hypr/plugin-windows";

import { AuthProvider } from "../auth";
import { BillingProvider } from "../billing";
import * as main from "../store/tinybase/main";
import { useTabs } from "../store/zustand/tabs";
import { id } from "../utils";

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
  const { user_id } = main.UI.useValues(main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  const createNewSession = useCallback(() => {
    if (!store) {
      return;
    }

    const sessionId = id();

    store.setRow("sessions", sessionId, {
      user_id: user_id ?? "",
      created_at: new Date().toISOString(),
      title: "",
    });

    void analyticsCommands.event({
      event: "note_created",
      has_event_id: false,
    });

    openNew({ type: "sessions", id: sessionId });
  }, [store, user_id, openNew]);

  useEffect(() => {
    let unlistenNavigate: (() => void) | undefined;
    let unlistenDeepLink: (() => void) | undefined;
    let unlistenOpenTab: (() => void) | undefined;

    const webview = getCurrentWebviewWindow();

    void windowsEvents
      .navigate(webview)
      .listen(({ payload }) => {
        if (payload.path === "/app/new") {
          createNewSession();
        } else if (payload.path === "/app/settings") {
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
  }, [navigate, openNew, createNewSession]);
};
