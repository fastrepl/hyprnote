import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

import LeftSidebar from "@/components/left-sidebar";
import { LoginModal } from "@/components/login-modal";
import Notifications from "@/components/toast";
import Toolbar from "@/components/toolbar";
import {
  HyprProvider,
  LeftSidebarProvider,
  LoginModalProvider,
  NewNoteProvider,
  OngoingSessionProvider,
  RightPanelProvider,
  SearchProvider,
  SessionsProvider,
  SettingsProvider,
  useLoginModal,
} from "@/contexts";
import { registerTemplates } from "@/templates";
import { commands } from "@/types";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

export const Route = createFileRoute("/app")({
  component: Component,
  beforeLoad: async () => {
    const isOnboardingNeeded = await commands.isOnboardingNeeded();
    if (isOnboardingNeeded) {
      // Instead of redirecting to login page, we'll show the login modal
      return { showLoginModal: true };
    }
    return { showLoginModal: false };
  },
  loader: async ({ context: { sessionsStore } }) => {
    return sessionsStore;
  },
});

function Component() {
  const store = Route.useLoaderData();
  const { showLoginModal } = Route.useRouteContext();
  const windowLabel = getCurrentWebviewWindowLabel();

  useEffect(() => {
    registerTemplates();
  }, []);

  return (
    <>
      <HyprProvider>
        <SessionsProvider store={store}>
          <OngoingSessionProvider>
            <LeftSidebarProvider>
              <RightPanelProvider>
                <SettingsProvider>
                  <NewNoteProvider>
                    <SearchProvider>
                      <LoginModalProvider>
                        <div className="relative flex h-screen w-screen overflow-hidden">
                          <LeftSidebar />
                          <div className="flex-1 flex h-screen w-screen flex-col overflow-hidden">
                            <Toolbar />
                            <Outlet />
                          </div>
                        </div>
                        <LoginModalWithProvider showLoginModal={showLoginModal} />
                      </LoginModalProvider>
                    </SearchProvider>
                  </NewNoteProvider>
                </SettingsProvider>
              </RightPanelProvider>
            </LeftSidebarProvider>
          </OngoingSessionProvider>
        </SessionsProvider>
      </HyprProvider>
      {windowLabel === "main" && <Notifications />}
    </>
  );
}

function LoginModalWithProvider({ showLoginModal }: { showLoginModal: boolean }) {
  const { isLoginModalOpen, closeLoginModal, setShouldShowLoginModal } = useLoginModal();
  
  useEffect(() => {
    setShouldShowLoginModal(showLoginModal);
  }, [showLoginModal, setShouldShowLoginModal]);
  
  return (
    <LoginModal 
      isOpen={isLoginModalOpen} 
      onClose={closeLoginModal} 
    />
  );
}
