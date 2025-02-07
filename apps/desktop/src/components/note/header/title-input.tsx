import { type ChangeEvent } from "react";
import clsx from "clsx";

interface TitleInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function TitleInput({ value, onChange }: TitleInputProps) {
  return (
    <input
      type="text"
      onChange={onChange}
      value={value}
      placeholder="Untitled meeting"
      className={clsx([
        "w-full border-none bg-transparent text-2xl font-bold",
        "caret-gray-300 focus:outline-none",
      ])}
    />
  );
}
