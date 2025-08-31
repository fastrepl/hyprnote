import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import useDebouncedCallback from "beautiful-react-hooks/useDebouncedCallback";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type TranscriptEditorRef } from "@hypr/tiptap/transcript";
import { type TiptapEditor } from "@hypr/tiptap/editor";

interface FloatingSearchBoxProps {
  editorRef: React.RefObject<TranscriptEditorRef | null> | React.RefObject<{ editor: TiptapEditor | null }>;
  onClose: () => void;
  isVisible: boolean;
}

export function FloatingSearchBox({ editorRef, onClose, isVisible }: FloatingSearchBoxProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Stable helper function to get the editor
  const getEditor = useCallback(() => {
    const ref = editorRef.current;
    if (!ref) return null;
    
    // For both normal editor and transcript editor, just access the editor property
    if ('editor' in ref) {
      return ref.editor;
    }
    
    return null;
  }, [editorRef]);

  // Add ref for the search box container
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Debounced search term update - NO getEditor in deps
  const debouncedSetSearchTerm = useDebouncedCallback(
    (value: string) => {
      const editor = getEditor();
      if (editor) {
        editor.commands.setSearchTerm(value);
        editor.commands.resetIndex();
        setTimeout(() => {
          const storage = editor.storage.searchAndReplace;
          const results = storage?.results || [];
          setResultCount(results.length);
          setCurrentIndex((storage?.resultIndex ?? 0) + 1);
        }, 100);
      }
    },
    [], // Empty deps to prevent infinite re-creation
    300,
  );

  useEffect(() => {
    debouncedSetSearchTerm(searchTerm);
  }, [searchTerm, debouncedSetSearchTerm]);

  useEffect(() => {
    const editor = getEditor();
    if (editor) {
      editor.commands.setReplaceTerm(replaceTerm);
    }
  }, [replaceTerm]); // Removed getEditor from deps

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isVisible]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    
    if (isVisible) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isVisible]);

  const scrollCurrentResultIntoView = useCallback(() => {
    const editor = getEditor();
    if (!editor) return;
    
    const editorElement = editor.view.dom;
    const current = editorElement.querySelector(".search-result-current") as HTMLElement | null;
    if (current) {
      current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  }, [getEditor]);

  const handleNext = useCallback(() => {
    const editor = getEditor();
    if (editor) {
      editor.commands.nextSearchResult();
      setTimeout(() => {
        const storage = editor.storage.searchAndReplace;
        setCurrentIndex((storage?.resultIndex ?? 0) + 1);
        scrollCurrentResultIntoView();
      }, 100);
    }
  }, [getEditor, scrollCurrentResultIntoView]);

  const handlePrevious = useCallback(() => {
    const editor = getEditor();
    if (editor) {
      editor.commands.previousSearchResult();
      setTimeout(() => {
        const storage = editor.storage.searchAndReplace;
        setCurrentIndex((storage?.resultIndex ?? 0) + 1);
        scrollCurrentResultIntoView();
      }, 100);
    }
  }, [getEditor, scrollCurrentResultIntoView]);

  const handleReplace = useCallback(() => {
    const editor = getEditor();
    if (editor) {
      editor.commands.replace();
      setTimeout(() => {
        const storage = editor.storage.searchAndReplace;
        const results = storage?.results || [];
        setResultCount(results.length);
        setCurrentIndex((storage?.resultIndex ?? 0) + 1);
      }, 100);
    }
  }, [getEditor]);

  const handleReplaceAll = useCallback(() => {
    const editor = getEditor();
    if (editor) {
      editor.commands.replaceAll();
      setTimeout(() => {
        const storage = editor.storage.searchAndReplace;
        const results = storage?.results || [];
        setResultCount(results.length);
        setCurrentIndex(0);
      }, 100);
    }
  }, [getEditor]);

  const handleClose = useCallback(() => {
    const editor = getEditor();
    if (editor) {
      editor.commands.setSearchTerm("");
    }
    setSearchTerm("");
    setReplaceTerm("");
    setResultCount(0);
    setCurrentIndex(0);
    onClose();
  }, [getEditor, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  if (!isVisible) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 z-50">
      <div
        ref={searchBoxRef}
        className="bg-white border border-neutral-200 rounded-lg shadow-lg p-3 min-w-96"
      >
        <div className="flex items-center gap-2 mb-2">
          {/* Search Input */}
          <div className="flex items-center gap-1 bg-transparent border border-neutral-200 rounded px-2 py-1 flex-1">
            <Input
              className="h-6 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 bg-transparent flex-1 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              autoFocus
            />
          </div>

          {/* Results Counter */}
          {searchTerm && (
            <span className="text-xs text-neutral-500 whitespace-nowrap min-w-12 text-center">
              {resultCount > 0 ? `${currentIndex}/${resultCount}` : "0/0"}
            </span>
          )}

          {/* Navigation Buttons */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handlePrevious}
            disabled={resultCount === 0}
          >
            <ChevronUpIcon size={12} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleNext}
            disabled={resultCount === 0}
          >
            <ChevronDownIcon size={12} />
          </Button>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleClose}
          >
            <XIcon size={12} />
          </Button>
        </div>

        {/* Replace Row */}
        <div className="flex items-center gap-2">
          {/* Replace Input */}
          <div className="flex items-center gap-1 bg-transparent border border-neutral-200 rounded px-2 py-1 flex-1">
            <Input
              className="h-6 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 bg-transparent flex-1 text-sm"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Replace..."
            />
          </div>

          {/* Replace Buttons */}
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
        </div>
      </div>
    </div>
  );
}
