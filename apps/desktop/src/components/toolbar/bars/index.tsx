export * from "./calendar-toolbar";
export * from "./default-toolbar";
export * from "./entity-toolbar";
export * from "./main-toolbar";
export * from "./note-toolbar";

import { useEditMode } from "@/contexts";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";

export function EditableEntityWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMain = getCurrentWebviewWindowLabel() === "main";

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1">
        <main className="flex h-full relative">
          {isMain && (
            <div className="absolute top-4 right-4 z-10">
              <EditButton />
            </div>
          )}
          <div className="max-w-xl mx-auto px-4 py-6 overflow-y-auto scrollbar-none w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function EditButton() {
  const { isEditing, setIsEditing } = useEditMode();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setIsEditing(!isEditing)}
    >
      {isEditing ? "Save" : "Edit"}
    </Button>
  );
}
