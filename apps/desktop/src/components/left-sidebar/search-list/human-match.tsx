import { useMatch, useNavigate } from "@tanstack/react-router";
import { clsx } from "clsx";
import { type SearchMatch } from "@/stores/search";

export function HumanMatch({ match: { item: human } }: { match: SearchMatch & { type: "human" } }) {
  const navigate = useNavigate();
  const match = useMatch({ from: "/app/human/$id", shouldThrow: false });

  const isActive = match?.params.id === human.id;

  const handleClick = () => {
    navigate({
      to: "/app/human/$id",
      params: { id: human.id },
    });
  };

  return (
    <button
      onClick={handleClick}
      className={clsx([
        "w-full text-left group flex items-start py-2 rounded-lg px-2",
        isActive ? "bg-neutral-200" : "hover:bg-neutral-100",
      ])}
    >
      <div className="flex flex-col items-start gap-1">
        <div className="font-medium text-sm line-clamp-1">{human.full_name || "Unnamed Person"}</div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 line-clamp-1">
          <span>Person • {human.email || human.job_title || "No details"}</span>
        </div>
      </div>
    </button>
  );
}
