import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

// import { UpcomingEvents } from "../components/home/UpcomingEvents";
// import { PastNotes } from "../components/home/PastNotes";
import Editor from "../components/editor";

import { Event, Note } from "../types";
import { useEnhance } from "../utils";
import { JSONContent } from "@tiptap/react";

const queryOptions = () => ({
  queryKey: ["notes"],
  queryFn: () => {
    return {
      notes: [],
      events: [],
    };
  },
});

export const Route = createFileRoute("/_nav/")({
  component: Component,
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(queryOptions());
  },
  // beforeLoad: ({ context }) => {
  //   if (!context.auth?.isAuthenticated) {
  //     throw redirect({ to: "/login" });
  //   }
  // },
});

function Component() {
  const navigate = useNavigate();
  const {
    data: { notes: _notes, events: _events },
  } = useSuspenseQuery(queryOptions());

  const [editorContent, setEditorContent] = useState<JSONContent>({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hello World!" }],
      },
    ],
  });

  const handleChange = useCallback((content: JSONContent) => {
    setEditorContent(content);
  }, []);

  const { data, isLoading, error, stop, submit } = useEnhance({
    baseUrl: "http://127.0.0.1:8000",
    apiKey: "TODO",
    editor: editorContent,
  });

  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (data) {
      setEditorContent(data);
    }
  }, [data]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col space-y-8 p-6">
      {error && <div>Error: {error.message}</div>}

      {isLoading ? (
        <button type="button" onClick={() => stop()}>
          Stop
        </button>
      ) : (
        <button type="button" onClick={() => submit()}>
          Enhance
        </button>
      )}

      <Editor handleChange={handleChange} content={editorContent} />
    </main>
  );
}
