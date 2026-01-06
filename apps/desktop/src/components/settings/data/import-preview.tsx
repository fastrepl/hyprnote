import {
  Building2Icon,
  FileTextIcon,
  Loader2Icon,
  MicIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";

import { type ImportStats } from "@hypr/plugin-importer";
import { Button } from "@hypr/ui/components/ui/button";

export function ImportPreview({
  stats,
  sourceName,
  onConfirm,
  onCancel,
  isPending,
}: {
  stats: ImportStats;
  sourceName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const totalItems =
    stats.notes_count +
    stats.transcripts_count +
    stats.humans_count +
    stats.organizations_count;

  const hasData = totalItems > 0;

  const statItems = [
    { icon: FileTextIcon, label: "Notes", count: stats.notes_count },
    { icon: MicIcon, label: "Transcripts", count: stats.transcripts_count },
    { icon: UserIcon, label: "People", count: stats.humans_count },
    {
      icon: Building2Icon,
      label: "Organizations",
      count: stats.organizations_count,
    },
    { icon: UsersIcon, label: "Participants", count: stats.participants_count },
  ].filter((item) => item.count > 0);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium">Import from {sourceName}</h4>
        </div>
        {hasData ? (
          <div className="flex items-center gap-3 text-xs text-neutral-600 flex-wrap">
            {statItems.map(({ icon: Icon, label, count }) => (
              <span key={label} className="flex items-center gap-1">
                <Icon size={12} />
                {count} {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-500">No data found to import.</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        {hasData && (
          <Button size="sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2Icon size={14} className="animate-spin mr-1" />
                Importing...
              </>
            ) : (
              `Import ${totalItems}`
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
