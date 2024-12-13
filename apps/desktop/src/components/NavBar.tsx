import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useClickOutside } from "../hooks/useClickOutside";
import SearchModal from "./SearchModal";
import SettingsModal from "./SettingsModal";
import { useUI } from "../contexts/UIContext";
import {
  ChevronLeft,
  Menu,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";

export default function NavBar() {
  const { isPanelOpen, setIsPanelOpen } = useUI();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isNotePage = location.pathname.startsWith("/note/");

  useClickOutside(searchRef, () => {
    setIsSearchOpen(false);
  });

  useClickOutside(profileRef, () => {
    setIsProfileMenuOpen(false);
  });

  useClickOutside(exportRef, () => {
    setIsExportMenuOpen(false);
  });

  const handleNewNote = useCallback(() => {
    const noteId = crypto.randomUUID();
    navigate(`/note/${noteId}`);
  }, [navigate]);

  const handleSettingsClick = useCallback(() => {
    window.dispatchEvent(new Event("openSettings"));
  }, []);

  const toggleProfileMenu = useCallback(() => {
    setIsProfileMenuOpen((prev) => !prev);
  }, []);

  const toggleExportMenu = useCallback(() => {
    setIsExportMenuOpen((prev) => !prev);
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen(!isPanelOpen);
  }, [setIsPanelOpen, isPanelOpen]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyPress, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  return (
    <>
      <header className="w-full border-b">
        <nav className="px-4">
          <div className="flex h-12 items-center justify-between">
            {/* Left Section - Profile */}
            <div className="flex items-center gap-4">
              {isNotePage ? (
                <button
                  onClick={() => navigate(-1)}
                  className="rounded p-2 hover:bg-gray-100"
                >
                  <ChevronLeft className="size-5" />
                </button>
              ) : (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={toggleProfileMenu}
                    className="flex items-center justify-center overflow-hidden rounded p-2 hover:bg-gray-200"
                    aria-label={
                      isProfileMenuOpen
                        ? "Close profile menu"
                        : "Open profile menu"
                    }
                  >
                    <Menu className="size-5" />
                  </button>
                  {isProfileMenuOpen && (
                    <div className="absolute left-0 mt-2 w-64 rounded-lg border bg-white shadow-lg">
                      <div className="space-y-1 border-b p-4">
                        <div className="font-medium">John Snow</div>
                        <div className="text-sm text-gray-500">
                          hong@example.com
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                            무료 체험
                          </span>
                          <span className="text-xs text-gray-500">
                            13일 남음
                          </span>
                        </div>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={handleSettingsClick}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          초대 링크 복사
                        </button>
                        <button
                          onClick={handleSettingsClick}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          설정
                        </button>
                        <button
                          onClick={handleSettingsClick}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          피드백 보내기
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Section - Search and New Note */}
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="flex items-center gap-2 rounded-md sm:bg-gray-100 sm:py-2 sm:pl-3 sm:pr-2"
                  aria-label="검색"
                >
                  <svg
                    className="h-4 w-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span className="hidden text-xs text-gray-600 sm:inline">
                    검색...
                    <span className="ml-4 rounded bg-gray-300 px-2 py-0.5 text-xs">
                      ⌘K
                    </span>
                  </span>
                </button>
              </div>

              {/* Share Link Button - Changed to Export dropdown */}
              {isNotePage && (
                <div className="relative" ref={exportRef}>
                  <button
                    onClick={toggleExportMenu}
                    className="rounded-md border px-2.5 py-2 text-xs text-gray-700 hover:bg-gray-100"
                    aria-label={
                      isExportMenuOpen
                        ? "Close export menu"
                        : "Open export menu"
                    }
                  >
                    Export
                  </button>
                  {isExportMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg border bg-white shadow-lg">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            /* MD 다운로드 로직 */
                            setIsExportMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Markdown으로 내보내기
                        </button>
                        <button
                          onClick={() => {
                            /* PDF 다운로드 로직 */
                            setIsExportMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          PDF로 내보내기
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* New Note Button */}
              {isNotePage ? (
                <button
                  onClick={togglePanel}
                  className="rounded p-2 hover:bg-gray-100"
                  aria-label={isPanelOpen ? "Close panel" : "Open panel"}
                >
                  {isPanelOpen ? (
                    <PanelRightClose className="size-5" />
                  ) : (
                    <PanelRightOpen className="size-5" />
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNewNote}
                  className="rounded-md bg-blue-500 px-2.5 py-1 text-sm text-white hover:bg-blue-600"
                  aria-label="새 노트 만들기"
                >
                  새 노트
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
