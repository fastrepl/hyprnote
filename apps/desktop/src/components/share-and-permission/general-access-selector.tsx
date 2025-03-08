import { Button } from "@hypr/ui/components/ui/button";
import { useState } from "react";
import {
  BuildingIcon,
  ChevronDown,
  ChevronRight,
  FolderIcon,
  LockIcon,
} from "lucide-react";
import { cn } from "@hypr/ui/lib/utils";

export interface GeneralAccessSelectorProps {
  expanded: boolean;
  onToggle: () => void;
}

type AccessType = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const accessTypes: Record<string, AccessType> = {
  invited: {
    icon: <LockIcon className="size-4 text-neutral-600" />,
    title: "Invited Only",
    description: "Only invited people can access",
  },
  folder: {
    icon: <FolderIcon className="size-4 text-neutral-600" />,
    title: "Folder Members",
    description: "+ Authorized personnels can access",
  },
  workspace: {
    icon: <BuildingIcon className="size-4 text-neutral-600" />,
    title: "All Workspace Members",
    description: "+ Everyone in the workspace can access",
  },
} as const;

export const GeneralAccessSelector = ({
  expanded,
  onToggle,
}: GeneralAccessSelectorProps) => {
  const [selectedAccess, setSelectedAccess] =
    useState<keyof typeof accessTypes>("invited");

  return (
    <>
      <div
        className="flex items-center justify-between hover:bg-neutral-200 min-h-11 rounded-lg -mx-2 px-2 py-1 cursor-pointer"
        onClick={onToggle}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-neutral-100 flex items-center justify-center">
            {accessTypes[selectedAccess].icon}
          </div>

          <div className="text-sm font-medium">
            {accessTypes[selectedAccess].title}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="hover:bg-transparent">
          {expanded ? (
            <ChevronDown className="size-4 text-neutral-600" />
          ) : (
            <ChevronRight className="size-4 text-neutral-600" />
          )}
        </Button>
      </div>
      {expanded && (
        <div className="pl-2 space-y-3">
          {Object.entries(accessTypes).map(
            ([key, { icon, title, description }]) => (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-3 hover:bg-neutral-200 rounded-lg -mx-2 px-2 py-1 cursor-pointer",
                  selectedAccess === key && "bg-neutral-100",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAccess(key as keyof typeof accessTypes);
                }}
              >
                <div className="size-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                  {icon}
                </div>
                <div>
                  <div className="text-sm font-medium">{title}</div>
                  <div className="text-xs text-neutral-600">{description}</div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </>
  );
};
