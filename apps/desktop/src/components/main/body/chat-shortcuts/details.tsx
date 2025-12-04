import { useCallback, useEffect, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Textarea } from "@hypr/ui/components/ui/textarea";

import * as main from "../../../../store/tinybase/main";
import {
  DangerZone,
  ResourceDetailEmpty,
  ResourcePreviewHeader,
} from "../resource-list";

type WebShortcut = {
  slug: string;
  title: string;
  description: string;
  category: string;
  targets?: string[];
  prompt: string;
};

export function ChatShortcutDetailsColumn({
  isWebMode,
  selectedMineId,
  selectedWebShortcut,
  setSelectedMineId,
  handleCloneShortcut,
}: {
  isWebMode: boolean;
  selectedMineId: string | null;
  selectedWebShortcut: WebShortcut | null;
  setSelectedMineId: (id: string | null) => void;
  handleCloneShortcut: (shortcut: WebShortcut) => void;
}) {
  if (isWebMode) {
    if (!selectedWebShortcut) {
      return <ResourceDetailEmpty message="Select a shortcut to preview" />;
    }
    return (
      <WebShortcutPreview
        shortcut={selectedWebShortcut}
        onClone={handleCloneShortcut}
      />
    );
  }

  if (!selectedMineId) {
    return <ResourceDetailEmpty message="Select a shortcut to view or edit" />;
  }

  return (
    <ChatShortcutForm
      key={selectedMineId}
      id={selectedMineId}
      setSelectedMineId={setSelectedMineId}
    />
  );
}

function WebShortcutPreview({
  shortcut,
  onClone,
}: {
  shortcut: WebShortcut;
  onClone: (shortcut: WebShortcut) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <ResourcePreviewHeader
        title={shortcut.title}
        description={shortcut.description}
        category={shortcut.category}
        targets={shortcut.targets}
        onClone={() => onClone(shortcut)}
      />

      <div className="flex-1 p-6">
        <h3 className="text-sm font-medium text-neutral-600 mb-3">
          Prompt Content
        </h3>
        <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <p className="text-sm text-neutral-700 whitespace-pre-wrap">
            {shortcut.prompt}
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatShortcutForm({
  id,
  setSelectedMineId,
}: {
  id: string;
  setSelectedMineId: (id: string | null) => void;
}) {
  const content = main.UI.useCell(
    "chat_shortcuts",
    id,
    "content",
    main.STORE_ID,
  );
  const [localValue, setLocalValue] = useState(content || "");

  useEffect(() => {
    setLocalValue(content || "");
  }, [content, id]);

  const handleUpdate = main.UI.useSetPartialRowCallback(
    "chat_shortcuts",
    id,
    (row: { content?: string }) => row,
    [id],
    main.STORE_ID,
  );

  const handleDelete = main.UI.useDelRowCallback(
    "chat_shortcuts",
    () => id,
    main.STORE_ID,
  );

  const handleSave = useCallback(() => {
    handleUpdate({ content: localValue });
  }, [handleUpdate, localValue]);

  const handleDeleteClick = useCallback(() => {
    handleDelete();
    setSelectedMineId(null);
  }, [handleDelete, setSelectedMineId]);

  const hasChanges = localValue !== (content || "");

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Edit Shortcut</h2>
            <p className="text-sm text-neutral-500 mt-1">
              Create a quick shortcut for chat inputs
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        <Textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder="Enter your chat shortcut content..."
          className="min-h-[200px] resize-none"
        />
      </div>

      <div className="p-6 border-t border-neutral-200">
        <DangerZone
          title="Delete this shortcut"
          description="This action cannot be undone"
          buttonLabel="Delete Shortcut"
          onAction={handleDeleteClick}
        />
      </div>
    </div>
  );
}
