import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import NoteEditor, { type JSONContent } from "@hypr/tiptap/editor";
import { EMPTY_TIPTAP_DOC } from "@hypr/tiptap/shared";
import "@hypr/tiptap/styles.css";

import {
  FileInfo,
  TranscriptDisplay,
} from "@/components/transcription/transcript-display";
import { UploadArea } from "@/components/transcription/upload-area";
import { transcribeAudio } from "@/functions/transcription";
import { uploadAudioFile } from "@/functions/upload";

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
  const [error, setError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<JSONContent>(EMPTY_TIPTAP_DOC);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setTranscript(null);
    setError(null);
    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);

      reader.onload = async () => {
        const base64Data = reader.result?.toString().split(",")[1];
        if (!base64Data) {
          setError("Failed to read file");
          setIsProcessing(false);
          return;
        }

        const uploadResult = await uploadAudioFile({
          data: {
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileData: base64Data,
          },
        });

        if ("error" in uploadResult && uploadResult.error) {
          setError(uploadResult.message || "Failed to upload file");
          setIsProcessing(false);
          return;
        }

        if (!("url" in uploadResult)) {
          setError("Failed to get upload URL");
          setIsProcessing(false);
          return;
        }

        const transcriptionResult = await transcribeAudio({
          data: {
            audioUrl: uploadResult.url,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
          },
        });

        if ("error" in transcriptionResult && transcriptionResult.error) {
          setError(transcriptionResult.message || "Failed to transcribe audio");
          setIsProcessing(false);
          return;
        }

        if ("transcript" in transcriptionResult) {
          setTranscript(transcriptionResult.transcript);
        }
        setIsProcessing(false);
      };

      reader.onerror = () => {
        setError("Failed to read file");
        setIsProcessing(false);
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsProcessing(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setTranscript(null);
    setError(null);
    setIsProcessing(false);
    setNoteContent(EMPTY_TIPTAP_DOC);
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
            <UploadArea
              onFileSelect={handleFileSelect}
              disabled={isProcessing}
            />
          ) : (
            <FileInfo
              fileName={file.name}
              fileSize={file.size}
              onRemove={handleRemoveFile}
            />
          )}

          {error && (
            <div className="border border-red-200 bg-red-50 rounded-sm p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <h2 className="text-lg font-medium font-serif mb-4">Notes</h2>
            <div className="border border-neutral-200 rounded-sm p-4 min-h-[200px]">
              <NoteEditor
                initialContent={noteContent}
                handleChange={setNoteContent}
                mentionConfig={mentionConfig}
              />
            </div>
          </div>

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
