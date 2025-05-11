import { useMatch } from "@tanstack/react-router";

import TranscriptFull from "./legacy";

export function TranscriptView() {
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });

  if (!noteMatch) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-neutral-500">
          Widgets are only available in note view.
        </div>
      </div>
    );
  }

  return <TranscriptFull />;
}
