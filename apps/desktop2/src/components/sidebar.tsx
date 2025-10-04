import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCell, useSliceRowIds } from "tinybase/ui-react";

import * as persisted from "../tinybase/store/persisted";

export function Sidebar() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  return (
    <div className="flex h-screen border-r">
      <FolderColumn selectedFolderId={selectedFolderId} onSelectFolder={setSelectedFolderId} />
      <SessionColumn selectedFolderId={selectedFolderId} />
    </div>
  );
}

function FolderColumn({
  selectedFolderId,
  onSelectFolder,
}: {
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
}) {
  const rootFolderIds = useSliceRowIds(persisted.INDEXES.foldersByParent, "", persisted.STORE_ID);

  return (
    <div className="w-[200px] h-full overflow-auto p-2 border-r bg-gray-50">
      <button
        onClick={() => onSelectFolder(null)}
        className={`w-full text-left px-2 py-1 mb-1 rounded ${
          selectedFolderId === null ? "bg-blue-100" : "hover:bg-gray-100"
        }`}
      >
        All Sessions
      </button>

      {rootFolderIds?.map((folderId) => (
        <RootFolder
          key={folderId}
          folderId={folderId}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
        />
      ))}
    </div>
  );
}

function SessionColumn({ selectedFolderId }: { selectedFolderId: string | null }) {
  const sessionIds = useSliceRowIds(
    persisted.INDEXES.sessionsByFolder,
    selectedFolderId ?? "",
    persisted.STORE_ID,
  );

  return (
    <div className="w-[250px] h-full overflow-auto p-2">
      {sessionIds?.map((sessionId) => <SessionItem key={sessionId} sessionId={sessionId} />)}
    </div>
  );
}

function RootFolder({
  folderId,
  selectedFolderId,
  onSelectFolder,
}: {
  folderId: string;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const name = useCell("folders", folderId, "name", persisted.STORE_ID);

  const subFolderIds = useSliceRowIds(persisted.INDEXES.foldersByParent, folderId, persisted.STORE_ID);

  const isSelected = selectedFolderId === folderId;

  return (
    <div className="mb-1">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          onSelectFolder(folderId);
        }}
        className={`w-full text-left px-2 py-1 rounded font-semibold ${
          isSelected ? "bg-blue-100" : "hover:bg-gray-100"
        }`}
      >
        {isOpen ? "▼" : "▶"} {name}
      </button>

      {isOpen && (
        <div className="ml-3">
          {subFolderIds?.map((subId) => (
            <SubFolder
              key={subId}
              folderId={subId}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubFolder({
  folderId,
  selectedFolderId,
  onSelectFolder,
}: {
  folderId: string;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
}) {
  const name = useCell("folders", folderId, "name", persisted.STORE_ID);
  const isSelected = selectedFolderId === folderId;

  return (
    <button
      onClick={() => onSelectFolder(folderId)}
      className={`w-full text-left px-2 py-1 mb-1 rounded text-sm ${isSelected ? "bg-blue-100" : "hover:bg-gray-100"}`}
    >
      {name}
    </button>
  );
}

function SessionItem({ sessionId }: { sessionId: string }) {
  const title = useCell("sessions", sessionId, "title", persisted.STORE_ID);

  return (
    <Link to="/app/note/$id" params={{ id: sessionId }}>
      <div className="px-2 py-1 hover:bg-blue-50 border-b border-gray-100">
        <div className="text-sm font-medium truncate">{title}</div>
      </div>
    </Link>
  );
}
