import { Outlet, useNavigate } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect } from "react";

import { events as deeplink2Events } from "@hypr/plugin-deeplink2";
import { events as windowsEvents } from "@hypr/plugin-windows";

import { AuthProvider } from "../auth";
import { BillingProvider } from "../billing";

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

  useEffect(() => {
    let unlistenNavigate: (() => void) | undefined;
    let unlistenDeepLink: (() => void) | undefined;

    const webview = getCurrentWebviewWindow();

    windowsEvents
      .navigate(webview)
      .listen(({ payload }) => {
        navigate({ to: payload.path, search: payload.search ?? undefined });
      })
      .then((fn) => {
        unlistenNavigate = fn;
      });

    deeplink2Events.deepLinkEvent
      .listen(({ payload }) => {
        navigate({ to: payload.to, search: payload.search });
      })
      .then((fn) => {
        unlistenDeepLink = fn;
      });

    return () => {
      unlistenNavigate?.();
      unlistenDeepLink?.();
    };
  }, [navigate]);
};
