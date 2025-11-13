import { cn } from "@hypr/utils";

export function TemplateCard({
  title,
  description,
  category,
  targets,
  onClick,
}: {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  targets?: string[] | null;
  onClick?: () => void;
}) {
  const displayTitle = title?.trim() ? title : "Untitled";
  const displayDescription = description?.trim()
    ? description
    : "No description provided.";

  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn([
        "flex items-start gap-4",
        "p-4 border border-neutral-200 rounded-lg",
        onClick
          ? "cursor-pointer transition-colors hover:bg-neutral-50"
          : "cursor-default",
      ])}
    >
      <div className="flex-1">
        <h3 className="text-sm font-medium mb-2 inline-flex items-center gap-1">
          <span>{displayTitle}</span>
          {category && <span className="text-stone-400">- {category}</span>}
        </h3>
        <p className="text-xs text-neutral-600 mb-2">{displayDescription}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {targets?.map((target, index) => (
            <span
              key={index}
              className="text-xs text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded"
            >
              {target}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
