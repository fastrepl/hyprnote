import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";
import { Calendar, Folder, Table } from "lucide-react";

type ViewType = "folder" | "calendar" | "table";

interface ViewSelectorProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ViewSelector({ currentView, onViewChange }: ViewSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-neutral-100 rounded-md">
      <Button
        variant={currentView === "folder" ? "default" : "ghost"}
        size="sm"
        className={cn(
          "h-8 transition-all",
          currentView === "folder" ? "px-1.5 py-1 min-w-[70px]" : "w-8 px-0 py-0",
        )}
        onClick={() => onViewChange("folder")}
      >
        <Folder size={14} />
        {currentView === "folder" && "Folder"}
      </Button>

      <Button
        variant={currentView === "calendar" ? "default" : "ghost"}
        size="sm"
        className={cn(
          "h-8 transition-all",
          currentView === "calendar" ? "px-1.5 py-1 min-w-[95px]" : "w-8 px-0 py-0",
        )}
        onClick={() => onViewChange("calendar")}
      >
        <Calendar size={14} />
        {currentView === "calendar" && "Calendar"}
      </Button>

      <Button
        variant={currentView === "table" ? "default" : "ghost"}
        size="sm"
        className={cn(
          "h-8 transition-all",
          currentView === "table" ? "px-1.5 py-1 min-w-[70px]" : "w-8 px-0 py-0",
        )}
        onClick={() => onViewChange("table")}
      >
        <Table size={14} />
        {currentView === "table" && "Table"}
      </Button>
    </div>
  );
}
