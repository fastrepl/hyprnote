import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";

import { useHyprSearch, useSession } from "@/contexts";
import { cn } from "@hypr/ui/lib/utils";

export default function OngoingSession({
  sessionId,
}: {
  sessionId: string;
}) {
  const navigate = useNavigate();
  const session = useSession(sessionId, (s) => s.session);

  const { setQuery } = useHyprSearch((s) => ({
    setQuery: s.setQuery,
  }));

  const handleClick = () => {
    setQuery("");

    navigate({
      to: "/app/note/$id",
      params: { id: sessionId },
    });
  };

  return (
    <motion.div
      key={sessionId}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="p-2 mb-2"
    >
      <button
        onClick={handleClick}
        className={cn(
          "group flex items-start gap-3 w-full text-left transition-all",
          "bg-neutral-900 hover:bg-neutral-700 p-2 rounded-lg",
        )}
      >
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center justify-between w-full">
            <div className="font-medium text-sm text-neutral-300 max-w-[180px] truncate">
              {session.title || "Untitled"}
            </div>
            <div className="text-xs text-neutral-400 animate-pulse w-2 h-2 rounded-full bg-white"></div>
          </div>
        </div>
      </button>
    </motion.div>
  );
}
