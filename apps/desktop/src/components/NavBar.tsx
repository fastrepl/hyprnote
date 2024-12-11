import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useClickOutside } from "../hooks/useClickOutside";
import SearchModal from "./SearchModal";
import SettingsModal from "./SettingsModal";
import { useUI } from "../contexts/UIContext";
import { PanelRightOpen, PanelRightClose, Menu } from "lucide-react";

export default function NavBar() {
  const { isPanelOpen, setIsPanelOpen } = useUI();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isNotePage = location.pathname.startsWith("/note/");

  useClickOutside(searchRef, () => {
    setIsSearchOpen(false);
  });

  useClickOutside(profileRef, () => {
    setIsProfileMenuOpen(false);
  });

  const handleNewNote = () => {
    const noteId = crypto.randomUUID();
    navigate(`/note/${noteId}`);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-white">
        <nav className="px-4">
          <div className="flex h-12 items-center justify-between">
            {/* Left Section - Profile */}
            <div className="flex items-center gap-4">
              {isNotePage ? (
                <button
                  onClick={() => navigate(-1)}
                  className="rounded p-2 hover:bg-gray-100"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              ) : (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center justify-center overflow-hidden rounded p-2 hover:bg-gray-200"
                  >
                    <svg
                      className="h-5 w-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <Menu className="h-5 w-5 text-gray-600" />
                    </svg>
                  </button>
                  {isProfileMenuOpen && (
                    <div className="absolute left-0 mt-2 w-64 rounded-lg border bg-white shadow-lg">
                      <div className="space-y-1 border-b p-4">
                        <div className="font-medium">홍길동</div>
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
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsSettingsOpen(true);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          초대 링크 복사
                        </button>
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsSettingsOpen(true);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          설정
                        </button>
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsSettingsOpen(true);
                          }}
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
                  className="flex items-center gap-2 rounded-md bg-gray-100 py-2 pl-3 pr-2 text-sm text-xs text-gray-600"
                >
                  <svg
                    className="h-4 w-4"
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
                  검색...
                  <span className="ml-4 rounded bg-gray-300 px-2 py-0.5 text-xs">
                    ⌘K
                  </span>
                </button>
              </div>

              {/* Share Link Button - Only show on note page */}
              {isNotePage && (
                <button
                  onClick={() => {
                    /* 공유 링크 생성 로직 */
                  }}
                  className="rounded-md border px-2.5 py-2 text-xs text-gray-700 hover:bg-gray-100"
                >
                  링크 공유
                </button>
              )}

              {/* New Note Button */}
              {isNotePage ? (
                <button
                  onClick={() => setIsPanelOpen(!isPanelOpen)}
                  className="rounded p-2 hover:bg-gray-100"
                >
                  {isPanelOpen ? (
                    <PanelRightClose className="h-5 w-5" />
                  ) : (
                    <PanelRightOpen className="h-5 w-5" />
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNewNote}
                  className="rounded-md px-2.5 py-1 text-sm text-gray-700 hover:bg-gray-100 md:bg-blue-500 md:text-white md:hover:bg-blue-600"
                >
                  새 노트
                </button>
              )}
            </div>
          </div>
        </nav>
      </header>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
