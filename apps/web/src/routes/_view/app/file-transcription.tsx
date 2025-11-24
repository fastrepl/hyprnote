import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { FileInfo, TranscriptDisplay } from "@/components/transcription/transcript-display";
import { UploadArea } from "@/components/transcription/upload-area";

export const Route = createFileRoute("/_view/app/file-transcription")({
  component: Component,
  validateSearch: (search: Record<string, unknown>) => ({
    id: (search.id as string) || undefined,
  }),
});

function Component() {
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
            <h2 className="text-lg font-medium font-serif mb-4">Transcript</h2>
            <TranscriptDisplay
              transcript={transcript}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
