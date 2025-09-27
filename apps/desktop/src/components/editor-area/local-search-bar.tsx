import { type TiptapEditor } from "@hypr/tiptap/editor";
import { type TranscriptEditorRef } from "@hypr/tiptap/transcript";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface LocalSearchBarProps {
  editorRef: React.RefObject<TranscriptEditorRef | null> | React.RefObject<{ editor: TiptapEditor | null }>;
  onClose: () => void;
  isVisible: boolean;
}

// A full-width, slide-down search/replace bar that reuses FloatingSearchBox logic
export function LocalSearchBar({ editorRef, onClose, isVisible }: LocalSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const getEditor = () => {
    const ref = editorRef.current as any;
    if (!ref) {
      return null;
    }
    if ("editor" in ref && ref.editor) {
      return ref.editor as TiptapEditor;
    }
    return null;
  };

  // Focus search input on open
  useEffect(() => {
    if (isVisible) {
      // Delay slightly to ensure mount before focus
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isVisible]);

  // Apply search term and compute counts
  const applySearch = useCallback((value: string) => {
    const editor = getEditor();
    if (editor && editor.commands) {
      try {
        editor.commands.setSearchTerm(value);
        editor.commands.resetIndex();
        setTimeout(() => {
          const storage = (editor as any).storage?.searchAndReplace;
          const results = storage?.results || [];
          setResultCount(results.length);
          setCurrentIndex((storage?.resultIndex ?? 0) + 1);
        }, 100);
      } catch {
        // ignore if editor not ready
      }
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      applySearch(searchTerm);
    }
  }, [searchTerm, isVisible, applySearch]);

  // Replace term binding
  useEffect(() => {
    if (!isVisible) {
      return;
    }
    const editor = getEditor();
    if (editor && editor.commands) {
      try {
        editor.commands.setReplaceTerm(replaceTerm);
      } catch {
        // ignore
      }
    }
  }, [replaceTerm, isVisible]);

  // Close on outside click
  /*
  useEffect(() => {
    if (!isVisible) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isVisible]);
  */

  // Close on Escape
  useEffect(() => {
    if (!isVisible) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isVisible]);

  const scrollCurrentResultIntoView = useCallback(() => {
    const editor = getEditor();
    if (!editor) {
      return;
    }
    try {
      const editorElement = (editor as any).view?.dom as HTMLElement | undefined;
      const current = editorElement?.querySelector(".search-result-current") as HTMLElement | null;
      current?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    } catch {
      // ignore
    }
  }, []);

  const handleNext = useCallback(() => {
    const editor = getEditor();
    if (editor) {
      editor.commands.nextSearchResult();
      setTimeout(() => {
        const storage = (editor as any).storage?.searchAndReplace;
        setCurrentIndex((storage?.resultIndex ?? 0) + 1);
        scrollCurrentResultIntoView();
      }, 100);
    }
  }, [scrollCurrentResultIntoView]);

  const handlePrevious = useCallback(() => {
    const editor = getEditor();
    if (editor) {
      editor.commands.previousSearchResult();
      setTimeout(() => {
        const storage = (editor as any).storage?.searchAndReplace;
        setCurrentIndex((storage?.resultIndex ?? 0) + 1);
        scrollCurrentResultIntoView();
      }, 100);
    }
  }, [scrollCurrentResultIntoView]);

  const handleReplace = useCallback(() => {
    const editor = getEditor();
    if (editor) {
      editor.commands.replace();
      setTimeout(() => {
        const storage = (editor as any).storage?.searchAndReplace;
        const results = storage?.results || [];
        setResultCount(results.length);
        setCurrentIndex((storage?.resultIndex ?? 0) + 1);
      }, 100);
    }
  }, []);

  const handleReplaceAll = useCallback(() => {
    const editor = getEditor();
    if (editor) {
      editor.commands.replaceAll();
      setTimeout(() => {
        const storage = (editor as any).storage?.searchAndReplace;
        const results = storage?.results || [];
        setResultCount(results.length);
        setCurrentIndex(0);
      }, 100);
    }
  }, []);

  const handleClose = useCallback(() => {
    const editor = getEditor();
    if (editor) {
      try {
        editor.commands.setSearchTerm("");
      } catch {}
    }
    setSearchTerm("");
    setReplaceTerm("");
    setResultCount(0);
    setCurrentIndex(0);
    onClose();
  }, [onClose]);

  const handleEnterNav = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    } else if (e.key === "F3") {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    }
  };

  return (
    <div
      className={`w-full overflow-hidden transition-all duration-200 ease-out -mt-4 ${
        isVisible ? "max-h-12 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1 pointer-events-none"
      }`}
      aria-hidden={!isVisible}
    >
      <div ref={containerRef} className="w-full bg-white border-b border-neutral-200">
        <div className="px-6 py-2">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="flex items-center gap-1 bg-transparent border border-border rounded-md px-2 py-1 flex-1">
              <Input
                ref={searchInputRef}
                className="h-3 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 bg-transparent flex-1 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleEnterNav}
                placeholder="Search..."
              />
            </div>

            {/* Replace */}
            <div className="flex items-center gap-1 bg-transparent border border-border rounded-md px-2 py-1 flex-1">
              <Input
                className="h-3 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 bg-transparent flex-1 text-xs"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                onKeyDown={handleEnterNav}
                placeholder="Replace..."
              />
            </div>

            {/* Count */}
            {searchTerm && (
              <span className="text-xs text-neutral-500 whitespace-nowrap text-center font-mono">
                {resultCount > 0 ? `${currentIndex}/${resultCount}` : "0/0"}
              </span>
            )}

            {/* Prev/Next */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handlePrevious}
              disabled={resultCount === 0}
            >
              <ChevronUpIcon size={12} />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleNext} disabled={resultCount === 0}>
              <ChevronDownIcon size={12} />
            </Button>

            {/* Replace actions */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleReplace}
              disabled={resultCount === 0 || !replaceTerm}
            >
              Replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleReplaceAll}
              disabled={resultCount === 0 || !replaceTerm}
            >
              All
            </Button>

            {/* Close */}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleClose}>
              <XIcon size={12} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
