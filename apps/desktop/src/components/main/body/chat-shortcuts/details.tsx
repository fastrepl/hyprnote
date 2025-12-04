import { useCallback, useEffect, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Textarea } from "@hypr/ui/components/ui/textarea";

import * as main from "../../../../store/tinybase/main";

export function ChatShortcutDetailsColumn({
  selectedChatShortcutId,
  setSelectedChatShortcut,
}: {
  selectedChatShortcutId: string | null;
  setSelectedChatShortcut: (id: string | null) => void;
}) {
  if (!selectedChatShortcutId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-neutral-500">
          Select a shortcut to view or edit
        </p>
      </div>
    );
  }

  return (
    <ChatShortcutDetails
      key={selectedChatShortcutId}
      id={selectedChatShortcutId}
      setSelectedChatShortcut={setSelectedChatShortcut}
    />
  );
}

function ChatShortcutDetails({
  id,
  setSelectedChatShortcut,
}: {
  id: string;
  setSelectedChatShortcut: (id: string | null) => void;
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
    setSelectedChatShortcut(null);
  }, [handleDelete, setSelectedChatShortcut]);

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
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <div className="bg-red-50 px-4 py-3 border-b border-red-200">
            <h3 className="text-sm font-semibold text-red-900">Danger Zone</h3>
          </div>
          <div className="bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  Delete this shortcut
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  This action cannot be undone
                </p>
              </div>
              <Button
                onClick={handleDeleteClick}
                variant="destructive"
                size="sm"
              >
                Delete Shortcut
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
