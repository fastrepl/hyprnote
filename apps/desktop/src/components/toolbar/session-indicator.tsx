import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { ArrowLeft } from "lucide-react";

import AudioIndicator from "../note/header/audio-indicator";

export function SessionIndicator({ sessionId }: { sessionId: string }) {
  return (
    <Link to="/app/note/$id" params={{ id: sessionId }}>
      <button
        className={clsx([
          "w-72",
          "hidden sm:flex",
          "flex-row items-center justify-between",
          "rounded-md border border-border px-2 py-2",
          "bg-primary transition-all duration-200",
          " ",
          "text-primary-foreground",
          "hover:scale-95",
        ])}
      >
        <ArrowLeft size={16} className="" />
        <span className="text-xs  font-semibold">Return to session</span>
        <AudioIndicator />
      </button>
    </Link>
  );
}
