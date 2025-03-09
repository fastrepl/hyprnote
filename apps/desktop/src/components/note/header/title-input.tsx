import { type KeyboardEvent, type ChangeEvent } from "react";
import clsx from "clsx";

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
      type="text"
      onChange={onChange}
      value={value}
      placeholder="Untitled"
      className={clsx([
        "w-full border-none bg-transparent text-2xl font-bold dark:text-neutral-100",
        "focus:outline-none",
      ])}
      onKeyDown={handleKeyDown}
    />
  );
}
