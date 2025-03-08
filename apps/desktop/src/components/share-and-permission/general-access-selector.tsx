import { Button } from "@hypr/ui/components/ui/button";
import { Building2, ChevronDown, ChevronRight, FolderIcon, LinkIcon, LockIcon } from "lucide-react";

export interface GeneralAccessSelectorProps {
  expanded: boolean;
  onToggle: () => void;
}

export const GeneralAccessSelector = ({
  expanded,
  onToggle,
}: GeneralAccessSelectorProps) => (
  <>
    <div
      className="flex items-center justify-between hover:bg-neutral-200 rounded-lg -mx-2 px-2 py-1 cursor-pointer"
      onClick={onToggle}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-neutral-100 flex items-center justify-center">
          <Building2 className="size-4 text-neutral-600" />
        </div>
        <div>
          <div className="text-sm font-medium">General Access</div>
          <div className="text-xs text-neutral-600">
            Anyone with the link can view
          </div>
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
        <div className="flex items-center gap-3 hover:bg-neutral-100 rounded-lg px-2 py-1 cursor-pointer">
          <div className="size-8 rounded-lg bg-neutral-100 flex items-center justify-center">
            <LockIcon className="size-4 text-neutral-600" />
          </div>
          <div>
            <div className="text-sm font-medium">Restricted</div>
            <div className="text-xs text-neutral-600">
              Only invited people can access
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 hover:bg-neutral-100 rounded-lg px-2 py-1 cursor-pointer">
          <div className="size-8 rounded-lg bg-neutral-100 flex items-center justify-center">
            <LinkIcon className="size-4 text-neutral-600" />
          </div>
          <div>
            <div className="text-sm font-medium">Anyone with the link</div>
            <div className="text-xs text-neutral-600">
              Anyone with the link can view
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 hover:bg-neutral-100 rounded-lg px-2 py-1 cursor-pointer">
          <div className="size-8 rounded-lg bg-neutral-100 flex items-center justify-center">
            <FolderIcon className="size-4 text-neutral-600" />
          </div>
          <div>
            <div className="text-sm font-medium">Workspace</div>
            <div className="text-xs text-neutral-600">
              Everyone in the workspace can access
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);
