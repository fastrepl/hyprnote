import { type Session } from "@hypr/plugin-db";
import { TiptapEditor } from "@hypr/tiptap/editor";
import Renderer from "@hypr/tiptap/renderer";
import { useRef } from "react";
import { useNote } from "../hooks/use-note";

interface ContentProps {
  session: Session;
}

export function NoteContent({ session }: ContentProps) {
  const rendererRef = useRef<{ editor: TiptapEditor }>(null);
  const { content } = useNote({ session });

  return (
    <div className="pt-2 pb-6">
      <Renderer
        ref={rendererRef}
        initialContent={content}
      />
    </div>
  );
}
