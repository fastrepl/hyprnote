import { type ChangeEvent } from "react";
import TitleInput from "./title-input";
import ListenButton from "./listen-button";
import Chips from "./chips";
import { useSession } from "@/contexts";

export function NoteHeader() {
  const store = useSession((s) => ({
    session: s.session,
    listening: s.listening,
    start: s.start,
    pause: s.pause,
    updateTitle: s.updateTitle,
    persistSession: s.persistSession,
  }));

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    store.updateTitle(e.target.value);
    store.persistSession();
  };

  return (
    <>
      <div className="flex flex-row items-center justify-between pl-8 pr-4 pt-6">
        <TitleInput value={store.session.title} onChange={handleTitleChange} />
        <ListenButton
          isListening={store.listening}
          onClick={store.start}
          onStop={store.pause}
        />
      </div>
      <Chips />
    </>
  );
}
