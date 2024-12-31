import { Trans, useLingui } from "@lingui/react/macro";

import type { Note } from "../../types";

interface PastNotesProps {
  notes: Note[];
  handleClickNote: (noteId: string) => void;
}

export const PastNotes = ({ notes, handleClickNote }: PastNotesProps) => {
  const { i18n } = useLingui();

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">
        <Trans>Recent Notes</Trans>
      </h2>

      <div className="space-y-4">
        {notes.map((note) => (
          <div
            key={note.id}
            onClick={() => handleClickNote(note.id)}
            className="cursor-pointer rounded-lg bg-white p-4 transition-shadow hover:shadow-[0_4px_12px_0px_rgba(251,191,36,0.2),0_4px_12px_0px_rgba(99,102,241,0.2)]"
          >
            <div className="mb-3 flex items-start justify-between">
              <h3 className="line-clamp-1 font-medium">
                {note.title || <Trans>Untitled</Trans>}
              </h3>
            </div>
            <p className="mb-2 shrink-0 text-sm text-gray-500">
              <Trans>{i18n.date(note.updatedAt)}</Trans>
            </p>
            <p className="my-2 line-clamp-2 text-sm text-gray-600">
              {note.rawMemo}
            </p>
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {note.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
