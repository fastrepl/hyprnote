import { useTranslation } from "react-i18next";
import { Note } from "../../types";

interface PastNotesProps {
  notes: Note[];
  onNoteClick: (noteId: string) => void;
}

export const PastNotes = ({ notes, onNoteClick }: PastNotesProps) => {
  const { t } = useTranslation();

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">{t('home.recentNotes')}</h2>
      <div className="space-y-4">
        {notes.map((note) => (
          <div
            key={note.id}
            onClick={() => onNoteClick(note.id)}
            className="cursor-pointer rounded-lg bg-white p-4 transition-shadow hover:shadow-[0_4px_12px_0px_rgba(251,191,36,0.2),0_4px_12px_0px_rgba(99,102,241,0.2)]"
          >
            <div className="mb-3 flex items-start justify-between">
              <h3 className="line-clamp-1 font-medium">
                {note.title || t('common.untitled')}
              </h3>
            </div>
            <p className="mb-2 shrink-0 text-sm text-gray-500">
              {t('home.updated', { time: new Date(note.updatedAt).toLocaleString() })}
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
