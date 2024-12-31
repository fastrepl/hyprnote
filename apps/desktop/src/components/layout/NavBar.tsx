import { useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  RiMenuLine,
  RiSidebarUnfoldLine,
  RiSidebarFoldLine,
} from "@remixicon/react";

import { Trans } from "@lingui/react/macro";
import { useUI } from "../../stores/ui";

import SearchModal from "../SearchModal";
import SettingsModal from "../modals/settings/SettingsModal";
import SearchBar from "./SearchBar";
import ExportMenu from "./ExportMenu";
import NavigationButtons from "./NavigationButtons";

export default function NavBar() {
  const { history, navigate } = useRouter();
  const { isPanelOpen, setIsPanelOpen } = useUI();

  const isNotePage = history.location.pathname.startsWith("/note/");

  const handleNewNote = useCallback(() => {
    navigate({ to: "/note/new" });
  }, [navigate]);

  const handleSettingsClick = useCallback(() => {
    window.dispatchEvent(new Event("openSettings"));
  }, []);

  const handleSearchClick = useCallback(() => {
    window.dispatchEvent(new Event("openSearch"));
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen(!isPanelOpen);
  }, [setIsPanelOpen, isPanelOpen]);

  return (
    <>
      <header className="w-full border-b">
        <nav className="px-4">
          <div className="flex h-12 items-center justify-between">
            {/* Left Section - Profile */}
            <div className="flex items-center">
              {isNotePage ? (
                <NavigationButtons
                  onHomeClick={() => navigate({ to: "/" })}
                  onBackClick={() => history.back()}
                />
              ) : (
                <button
                  onClick={handleSettingsClick}
                  className="flex items-center rounded p-2 hover:bg-gray-100"
                >
                  <RiMenuLine className="size-5" />
                </button>
              )}
            </div>

            {/* Right Section - Search and New Note */}
            <div className="flex items-center gap-4">
              <SearchBar onSearchClick={handleSearchClick} />

              {isNotePage && <ExportMenu />}

              {/* New Note Button */}
              {isNotePage ? (
                <button
                  onClick={togglePanel}
                  className="rounded p-2 hover:bg-gray-100"
                >
                  {isPanelOpen ? (
                    <RiSidebarUnfoldLine className="size-5" />
                  ) : (
                    <RiSidebarFoldLine className="size-5" />
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNewNote}
                  className="rounded-md bg-blue-500 px-2.5 py-1 text-sm text-white hover:bg-blue-600"
                >
                  <Trans>New Note</Trans>
                </button>
              )}
            </div>
          </div>
        </nav>
      </header>

      <SearchModal />
      <SettingsModal />
    </>
  );
}
