import { useLingui } from "@lingui/react/macro";
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef } from "react";

interface TitleInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onNavigateToEditor?: () => void;
  editable?: boolean;
  isGenerating?: boolean;
  autoFocus?: boolean;
}

export default function TitleInput({
  value,
  onChange,
  onNavigateToEditor,
  editable,
  isGenerating = false,
  autoFocus = false,
}: TitleInputProps) {
  const { t } = useLingui();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      onNavigateToEditor?.();
    }
  };

  const getPlaceholder = () => {
    if (isGenerating) {
      return t`Generating title...`;
    }
    return t`Untitled`;
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
      className="w-full border-none bg-transparent text-2xl font-bold focus:outline-none placeholder:text-neutral-400 transition-opacity duration-200"
      onKeyDown={handleKeyDown}
    />
  );
}
