import { useLingui } from "@lingui/react/macro";

import { Button } from "@anlg/ui/components/ui/button";
import { useSquircleRef } from "@anlg/ui/hooks/use-squircle";
import { cn } from "@anlg/utils";

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: "all" | "30d" | "7d";
  onChange: (value: "all" | "30d" | "7d") => void;
}) {
  const { t } = useLingui();
  const ref = useSquircleRef<HTMLDivElement>();
  const ranges = [
    { id: "all", label: t`All time` },
    { id: "30d", label: t`30 days` },
    { id: "7d", label: t`7 days` },
  ] as const;

  return (
    <div
      ref={ref}
      className="bg-muted flex gap-1 rounded-lg p-1"
      role="group"
      aria-label={t`Date range`}
    >
      {ranges.map((option) => (
        <Button
          key={option.id}
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn([
            "px-3 py-1.5 text-xs",
            value === option.id
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          ])}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
