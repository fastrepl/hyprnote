import { type ChangeEvent, type KeyboardEvent } from "react";

interface TitleInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onNavigateToEditor?: () => void;
}

export default function TitleInput({
  value,
  onChange,
  onNavigateToEditor,
}: TitleInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "Tab") {
      e.preventDefault();
      onNavigateToEditor?.();
    }
  };

  return (
    <input
      id="note-title-input"
      type="text"
      onChange={onChange}
      value={value}
      placeholder="Untitled"
      className="w-full border-none bg-transparent text-2xl font-bold focus:outline-none"
      onKeyDown={handleKeyDown}
    />
  );
}
