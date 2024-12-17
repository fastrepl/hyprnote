import { useState } from "react";
import { useNavigate } from "react-router";

import { mockNotes } from "../mocks/data";
import { UpcomingEvents } from "../components/home/UpcomingEvents";
import { PastNotes } from "../components/home/PastNotes";
import { NewUserBanner } from "../components/home/NewUserBanner";

export default function Home() {
  const [isNewUser] = useState(true);
  const navigate = useNavigate();

  // 현재 시간을 기준으로 미래/과거 이벤트 필터링
  const now = new Date();
  const futureNotes = mockNotes
    .filter(
      (note) =>
        note.calendarEvent?.start?.dateTime &&
        new Date(note.calendarEvent.start.dateTime) > now,
    )
    .sort((a, b) => {
      if (
        !a.calendarEvent?.start?.dateTime ||
        !b.calendarEvent?.start?.dateTime
      )
        return 0;
      return (
        new Date(a.calendarEvent.start.dateTime).getTime() -
        new Date(b.calendarEvent.start.dateTime).getTime()
      );
    });

  const pastNotes = mockNotes
    .filter(
      (note) =>
        !note.calendarEvent?.start?.dateTime ||
        new Date(note.calendarEvent.start.dateTime) <= now,
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  const handleNoteClick = (noteId: string) => {
    navigate(`/note/${noteId}`);
  };

  const handleDemoClick = () => {
    // TODO: 데모 페이지로 이동하는 로직 구현
    console.log("Demo clicked");
  };

  return (
    <main className="h-full bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="space-y-8">
          {isNewUser && <NewUserBanner onDemoClick={handleDemoClick} />}
          <UpcomingEvents
            futureNotes={futureNotes}
            onNoteClick={handleNoteClick}
          />
          <PastNotes notes={pastNotes} onNoteClick={handleNoteClick} />
        </div>
      </div>
    </main>
  );
}
