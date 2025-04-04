import { useLingui } from "@lingui/react/macro";
import { type ChangeEvent, type KeyboardEvent } from "react";

interface TitleInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onNavigateToEditor?: () => void;
  editable?: boolean;
}

export default function TitleInput({
  value,
  onChange,
  onNavigateToEditor,
  editable,
}: TitleInputProps) {
  const { t } = useLingui();

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      onNavigateToEditor?.();
    }
  };

  return (
    <input
      disabled={!editable}
      id="note-title-input"
      type="text"
      onChange={onChange}
      value={value}
      placeholder={t`Untitled`}
      className="w-full border-none bg-transparent text-2xl font-bold focus:outline-none placeholder:text-neutral-400"
      onKeyDown={handleKeyDown}
    />
  );
}
