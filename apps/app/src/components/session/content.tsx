import { useRef } from "react";
import type { Session } from "../../client";

import { TiptapEditor } from "@hypr/tiptap/editor";
import Renderer from "@hypr/tiptap/renderer";

interface ContentProps {
  session: Session;
}

export function Content({ session }: ContentProps) {
  const rendererRef = useRef<{ editor: TiptapEditor }>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl w-full">
          <div className="pb-20 pt-4 sm:-mx-4">
            <Renderer
              ref={rendererRef}
              initialContent={session.enhanced_memo_html || session.raw_memo_html}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
