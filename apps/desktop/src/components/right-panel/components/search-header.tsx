import useDebouncedCallback from "beautiful-react-hooks/useDebouncedCallback";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ReplaceIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
interface SearchHeaderProps {
  editorRef: React.RefObject<any>;
  onClose: () => void;
}

export function SearchHeader({ editorRef, onClose }: SearchHeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Add ref for the search header container
  const searchHeaderRef = useRef<HTMLDivElement>(null);

  // Debounced search term update
  const debouncedSetSearchTerm = useDebouncedCallback(
    (value: string) => {
      if (editorRef.current) {
        editorRef.current.editor.commands.setSearchTerm(value);
        editorRef.current.editor.commands.resetIndex();
        setTimeout(() => {
          const storage = editorRef.current.editor.storage.searchAndReplace;
          const results = storage.results || [];
          setResultCount(results.length);
          setCurrentIndex((storage.resultIndex ?? 0) + 1);
        }, 100);
      }
    },
    [editorRef],
    300,
  );

  useEffect(() => {
    debouncedSetSearchTerm(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.editor.commands.setReplaceTerm(replaceTerm);
    }
  }, [replaceTerm]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchHeaderRef.current && !searchHeaderRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNext = () => {
    if (editorRef.current?.editor) {
      editorRef.current.editor.commands.nextSearchResult();
      setTimeout(() => {
        const storage = editorRef.current.editor.storage.searchAndReplace;
        setCurrentIndex((storage.resultIndex ?? 0) + 1);
        scrollCurrentResultIntoView(editorRef);
      }, 100);
    }
  };

  const handlePrevious = () => {
    if (editorRef.current?.editor) {
      editorRef.current.editor.commands.previousSearchResult();
      setTimeout(() => {
        const storage = editorRef.current.editor.storage.searchAndReplace;
        setCurrentIndex((storage.resultIndex ?? 0) + 1);
        scrollCurrentResultIntoView(editorRef);
      }, 100);
    }
  };

  function scrollCurrentResultIntoView(editorRef: React.RefObject<any>) {
    if (!editorRef.current) {
      return;
    }
    const editorElement = editorRef.current.editor.view.dom;
    const current = editorElement.querySelector(".search-result-current") as HTMLElement | null;
    if (current) {
      current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  }

  const handleReplaceAll = () => {
    if (editorRef.current && searchTerm) {
      editorRef.current.editor.commands.replaceAll();
      setTimeout(() => {
        const storage = editorRef.current.editor.storage.searchAndReplace;
        const results = storage.results || [];
        setResultCount(results.length);
        setCurrentIndex(results.length > 0 ? 1 : 0);
      }, 100);
    }
  };

  const handleClose = () => {
    if (editorRef.current) {
      editorRef.current.editor.commands.setSearchTerm("");
    }
    onClose();
  };

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

  return (
    <header 
      ref={searchHeaderRef}
      className="flex items-center w-full px-4 py-1 my-1 border-b border-neutral-100 bg-neutral-50"
    >
      <div className="flex items-center gap-2 flex-1">
        {/* Search Input */}
        <div className="flex items-center gap-1 bg-transparent border border-neutral-200 rounded px-2 py-0.5 mb-1.5 flex-1 max-w-xs">
          <Input
            className="h-5 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 bg-transparent flex-1 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            autoFocus
          />
        </div>

        {/* Replace Input */}
        <div className="flex items-center gap-1 bg-transparent border border-neutral-200 rounded px-2 py-0.5 mb-1.5 flex-1 max-w-xs">
          <Input
            className="h-5 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 bg-transparent flex-1 text-xs"
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Replace..."
          />
        </div>

        {/* Results Counter */}
        {searchTerm && (
          <span className="text-xs text-neutral-500 whitespace-nowrap">
            {resultCount > 0 ? `${currentIndex}/${resultCount}` : "0/0"}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 ml-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handlePrevious}
          disabled={resultCount === 0}
          title="Previous (Shift+Enter)"
        >
          <ChevronUpIcon size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleNext}
          disabled={resultCount === 0}
          title="Next (Enter)"
        >
          <ChevronDownIcon size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReplaceAll}
          disabled={!searchTerm || resultCount === 0}
          className="h-7 px-2"
          title="Replace All"
        >
          <ReplaceIcon size={12} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleClose}
          title="Close (Esc)"
        >
          <XIcon size={14} />
        </Button>
      </div>
    </header>
  );
}
