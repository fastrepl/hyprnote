import { Outlet, useNavigate } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect } from "react";

import { events as windowsEvents } from "@hypr/plugin-windows";

import { AuthProvider } from "../auth";
import { BillingProvider } from "../billing";
import { NetworkProvider } from "../contexts/network";
import { useProModelAutoConfig } from "../hooks/useProModelAutoConfig";
import { useProSettingsReset } from "../hooks/useProSettingsReset";
import { useProSubscriptionModalTrigger } from "../hooks/useProSubscriptionModalTrigger";
import { useTrialExpiredModalTrigger } from "../hooks/useTrialExpiredModalTrigger";
import { useTrialStartOnFirstLaunch } from "../hooks/useTrialStartOnFirstLaunch";
import { useTabs } from "../store/zustand/tabs";
import { TrialBeginModal } from "./devtool/trial-begin-modal";
import { TrialExpiredModal } from "./devtool/trial-expired-modal";
import { FeedbackModal, useFeedbackModal } from "./feedback/feedback-modal";
import { useNewNote } from "./main/shared";

export default function MainAppLayout() {
  useNavigationEvents();
  useFeedbackEvents();

  return (
    <AuthProvider>
      <BillingProvider>
        <NetworkProvider>
          <MainAppContent />
        </NetworkProvider>
      </BillingProvider>
    </AuthProvider>
  );
}

function MainAppContent() {
  useProSettingsReset();
  useTrialExpiredModalTrigger();
  useProSubscriptionModalTrigger();
  useProModelAutoConfig();
  useTrialStartOnFirstLaunch();

  return (
    <>
      <Outlet />
      <TrialBeginModal />
      <TrialExpiredModal />
      <FeedbackModal />
    </>
  );
}

const useNavigationEvents = () => {
  const navigate = useNavigate();
  const openNew = useTabs((state) => state.openNew);
  const openNewNote = useNewNote({ behavior: "new" });

  useEffect(() => {
    let unlistenNavigate: (() => void) | undefined;
    let unlistenOpenTab: (() => void) | undefined;

    const webview = getCurrentWebviewWindow();

    void windowsEvents
      .navigate(webview)
      .listen(({ payload }) => {
        if (payload.path === "/app/new") {
          openNewNote();
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
        // TODO: Not very ideal
        if (payload.tab.type === "sessions" && payload.tab.id === "new") {
          openNewNote();
        } else {
          openNew(payload.tab);
        }
      })
      .then((fn) => {
        unlistenOpenTab = fn;
      });

    return () => {
      unlistenNavigate?.();
      unlistenOpenTab?.();
    };
  }, [navigate, openNew, openNewNote]);
};

const useFeedbackEvents = () => {
  const openFeedback = useFeedbackModal((state) => state.open);

  useEffect(() => {
    let unlistenOpenFeedback: (() => void) | undefined;

    const webview = getCurrentWebviewWindow();

    void windowsEvents
      .openFeedback(webview)
      .listen(({ payload }) => {
        const feedbackType = payload.feedback_type as "bug" | "feature";
        openFeedback(feedbackType);
      })
      .then((fn) => {
        unlistenOpenFeedback = fn;
      });

    return () => {
      unlistenOpenFeedback?.();
    };
  }, [openFeedback]);
};
