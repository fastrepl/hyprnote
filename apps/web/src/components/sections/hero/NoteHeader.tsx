import { ReactNode } from "react";

interface NoteHeaderProps {
  title: string;
  badge: {
    icon: ReactNode;
    text: string;
    color: "gray" | "blue";
  };
}

export function NoteHeader({ title, badge }: NoteHeaderProps) {
  const badgeColors = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="border-b px-6 py-3 bg-gray-50/50">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-800">{title}</span>
        <span
          className={`text-xs px-2 py-0.5 ${badgeColors[badge.color]} rounded flex items-center gap-1`}
        >
          {badge.icon}
          {badge.text}
        </span>
      </div>
    </div>
  );
}
