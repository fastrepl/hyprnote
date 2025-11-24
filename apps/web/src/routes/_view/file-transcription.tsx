import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { FileInfo, TranscriptDisplay } from "@/components/transcription/transcript-display";
import { UploadArea } from "@/components/transcription/upload-area";

export const Route = createFileRoute("/_view/file-transcription")({
  component: Component,
  validateSearch: (search: Record<string, unknown>) => ({
    id: (search.id as string) || undefined,
  }),
});

function Component() {
  const { user } = Route.useRouteContext();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setTranscript(null);
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setTranscript(
        "This is a sample transcript. Deepgram integration will be added later.",
      );
    }, 2000);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setTranscript(null);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="max-w-6xl mx-auto border-x border-neutral-100">
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

        <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
          {!file ? (
            <UploadArea onFileSelect={handleFileSelect} disabled={isProcessing} />
          ) : (
            <FileInfo
              fileName={file.name}
              fileSize={file.size}
              onRemove={handleRemoveFile}
            />
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium font-serif">Transcript</h2>
              {transcript && !user && (
                <Link
                  to="/auth"
                  className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
                >
                  Sign in to view full result
                </Link>
              )}
            </div>
            <TranscriptDisplay
              transcript={user ? transcript : null}
              isProcessing={isProcessing}
            />
            {transcript && !user && (
              <div className="mt-4 p-4 bg-stone-50 border border-neutral-200 rounded-sm">
                <p className="text-sm text-neutral-600">
                  Sign in to view and save your transcription results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
