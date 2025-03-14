import { type Session } from "@hypr/plugin-db";
import { NoteItem } from "./index";

interface NotesSectionProps {
  dateKey: string;
  date: Date;
  sessions: Session[];
  formatDateHeader: (date: Date) => string;
  onSelectNote: (sessionId: string) => void;
}

export const NotesSection = ({
  dateKey,
  date,
  sessions,
  formatDateHeader,
  onSelectNote,
}: NotesSectionProps) => {
  return (
    <section key={dateKey}>
      <h2 className="font-bold text-neutral-800 mb-3">
        {formatDateHeader(date)}
      </h2>

      <div className="space-y-2">
        {sessions.map((session: Session) => (
          <NoteItem
            key={session.id}
            session={session}
            onSelect={() => onSelectNote(session.id)}
          />
        ))}
      </div>
    </section>
  );
};
