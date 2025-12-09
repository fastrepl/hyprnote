import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";

import type { JSONContent } from "@hypr/tiptap/editor";
import { EMPTY_TIPTAP_DOC } from "@hypr/tiptap/shared";
import "@hypr/tiptap/styles.css";

import { TranscriptDisplay } from "@/components/transcription/transcript-display";
import { UploadArea } from "@/components/transcription/upload-area";
import { fetchUser } from "@/functions/auth";

const NoteEditor = lazy(() => import("@hypr/tiptap/editor"));

export const Route = createFileRoute("/_view/file-transcription")({
  component: Component,
  validateSearch: (search: Record<string, unknown>) => ({
    id: (search.id as string) || undefined,
  }),
  beforeLoad: async ({ search }) => {
    const user = await fetchUser();
    if (user) {
      throw redirect({ to: "/app/file-transcription", search });
    }
  },
});

function Component() {
  const navigate = useNavigate({ from: Route.fullPath });
  const [noteContent, setNoteContent] = useState<JSONContent>(EMPTY_TIPTAP_DOC);

  const handleFileSelect = () => {
    navigate({ to: "/auth" });
  };

  const mentionConfig = useMemo(
    () => ({
      trigger: "@",
      handleSearch: async () => {
        return [];
      },
    }),
    [],
  );

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="max-w-7xl mx-auto border-x border-neutral-100">
        <div className="flex items-center justify-center py-20 bg-linear-to-b from-stone-50/30 to-stone-100/30 border-b border-neutral-100">
          <div className="text-center max-w-2xl px-4">
            <h1 className="font-serif text-3xl font-medium mb-4">
              Audio Transcription
            </h1>
            <p className="text-neutral-600">
              Upload your audio file and get an accurate transcript powered by
              Deepgram
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-serif font-medium mb-2">
                  Raw Note + Audio
                </h2>
                <p className="text-sm text-neutral-600">
                  Upload your audio and add your notes
                </p>
              </div>

              <div className="border border-neutral-200 rounded-lg shadow-sm bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-sm text-neutral-500">
                    meeting content
                  </span>
                </div>

                <div className="p-6 space-y-6">
                  <UploadArea
                    onFileSelect={handleFileSelect}
                    disabled={false}
                  />

                  <div>
                    <h3 className="text-sm font-medium text-neutral-700 mb-3">
                      Your Notes
                    </h3>
                    <div className="border border-neutral-200 rounded-sm p-4 min-h-[200px] bg-neutral-50/30">
                      <Suspense fallback={null}>
                        <NoteEditor
                          initialContent={noteContent}
                          handleChange={setNoteContent}
                          mentionConfig={mentionConfig}
                        />
                      </Suspense>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-serif font-medium mb-2">
                    Final Result
                  </h2>
                  <p className="text-sm text-neutral-600">
                    Combined notes with transcript
                  </p>
                </div>
                <Link
                  to="/auth"
                  className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
                >
                  Sign in
                </Link>
              </div>

              <div className="border border-neutral-200 rounded-lg shadow-sm bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-sm text-neutral-500">summary</span>
                </div>

                <div className="p-6">
                  <TranscriptDisplay
                    transcript={null}
                    status="idle"
                    error={null}
                  />
                </div>
              </div>

              <div className="p-4 bg-stone-50 border border-neutral-200 rounded-sm">
                <p className="text-sm text-neutral-600">
                  Sign in to view and save your transcription results
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
