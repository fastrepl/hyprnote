import { cn } from "@hypr/ui/lib/utils";
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef } from "react";

interface TitleInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onNavigateToEditor?: () => void;
  editable?: boolean;
  isGenerating?: boolean;
  autoFocus?: boolean;
}

export function TitleInput({
  value,
  onChange,
  onNavigateToEditor,
  editable,
  isGenerating = false,
  autoFocus = false,
}: TitleInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      onNavigateToEditor?.();
    }
  };

  const getPlaceholder = () => {
    if (isGenerating) {
      return "Generating title...";
    }
    return "Untitled";
  };

  useEffect(() => {
    if (autoFocus && editable && !isGenerating && inputRef.current) {
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [autoFocus, editable, isGenerating]);

  return (
    <input
      ref={inputRef}
      disabled={!editable || isGenerating}
      id="note-title-input"
      type="text"
      onChange={onChange}
      value={value}
      placeholder={getPlaceholder()}
      className={cn(
        "w-full transition-opacity duration-200 px-2",
        "border-none bg-transparent focus:outline-none",
        "text-xl font-semibold placeholder:text-muted-foreground",
      )}
      onKeyDown={handleKeyDown}
    />
  );
}
