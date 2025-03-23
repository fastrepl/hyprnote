import { useMatch, useNavigate } from "@tanstack/react-router";

import { type SearchMatch } from "@/stores/search";
import { cn } from "@hypr/ui/lib/utils";

export function SessionMatch({ match: { item: session } }: { match: SearchMatch & { type: "session" } }) {
  const navigate = useNavigate();

  const match = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const isActive = match?.params.id === session.id;

  const handleClick = () => {
    navigate({
      to: "/app/note/$id",
      params: { id: session.id },
    });
  };

  return (
    <button
      onClick={handleClick}
      className={cn([
        "w-full text-left group flex items-start py-2 rounded-lg px-2",
        isActive ? "bg-neutral-200" : "hover:bg-neutral-100",
      ])}
    >
      <div className="flex flex-col items-start gap-1">
        <div className="font-medium text-sm line-clamp-1">{session.title || "Untitled Note"}</div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
          {new Date(session.created_at).toLocaleDateString()}
        </div>
      </div>
    </button>
  );
}
