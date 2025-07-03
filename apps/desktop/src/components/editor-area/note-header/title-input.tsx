import { useLingui } from "@lingui/react/macro";
import { type ChangeEvent, type KeyboardEvent } from "react";

interface TitleInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onNavigateToEditor?: () => void;
  editable?: boolean;
  isGenerating?: boolean;
}

export default function TitleInput({
  value,
  onChange,
  onNavigateToEditor,
  editable,
  isGenerating = false,
}: TitleInputProps) {
  const { t } = useLingui();

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

  return (
    <input
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
