import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import NoteEditor, { type JSONContent } from "@hypr/tiptap/editor";
import { EMPTY_TIPTAP_DOC } from "@hypr/tiptap/shared";
import "@hypr/tiptap/styles.css";

import {
  FileInfo,
  TranscriptDisplay,
} from "@/components/transcription/transcript-display";
import { UploadArea } from "@/components/transcription/upload-area";
import {
  getAudioPipelineStatus,
  startAudioPipeline,
  type StatusStateType,
} from "@/functions/transcription";
import { uploadAudioFile } from "@/functions/upload";

export const Route = createFileRoute("/_view/app/file-transcription")({
  component: Component,
  validateSearch: (search: Record<string, unknown>) => ({
    id: (search.id as string) || undefined,
  }),
});

function Component() {
  const [file, setFile] = useState<File | null>(null);
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<JSONContent>(EMPTY_TIPTAP_DOC);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const pipelineStatusQuery = useQuery({
    queryKey: ["audioPipelineStatus", pipelineId],
    queryFn: async (): Promise<StatusStateType> => {
      if (!pipelineId) {
        throw new Error("Missing pipelineId");
      }
      const res = (await getAudioPipelineStatus({ data: { pipelineId } })) as
        | { success: true; status: StatusStateType }
        | { error: true; message?: string };
      if ("error" in res && res.error) {
        throw new Error(res.message ?? "Failed to get pipeline status");
      }
      if (!("status" in res) || !res.status) {
        throw new Error("Invalid response from pipeline status");
      }
      return res.status;
    },
    enabled: !!pipelineId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const isTerminal = status === "DONE" || status === "ERROR";
      return isTerminal ? false : 2000;
    },
  });

  useEffect(() => {
    const data = pipelineStatusQuery.data;
    if (data?.status === "DONE" && data.transcript) {
      setTranscript(data.transcript);
    }
  }, [pipelineStatusQuery.data]);

  const isProcessing =
    !!pipelineId &&
    !["DONE", "ERROR"].includes(pipelineStatusQuery.data?.status ?? "");

  const errorMessage =
    uploadError ??
    (pipelineStatusQuery.isError && pipelineStatusQuery.error instanceof Error
      ? pipelineStatusQuery.error.message
      : null) ??
    (pipelineStatusQuery.data?.status === "ERROR"
      ? pipelineStatusQuery.data.error
      : null);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setTranscript(null);
    setUploadError(null);
    setPipelineId(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);

      reader.onload = async () => {
        const base64Data = reader.result?.toString().split(",")[1];
        if (!base64Data) {
          setUploadError("Failed to read file");
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
          setUploadError(uploadResult.message || "Failed to upload file");
          return;
        }

        if (!("fileId" in uploadResult)) {
          setUploadError("Failed to get file ID");
          return;
        }

        const pipelineResult = await startAudioPipeline({
          data: {
            fileId: uploadResult.fileId,
          },
        });

        if ("error" in pipelineResult && pipelineResult.error) {
          setUploadError(pipelineResult.message || "Failed to start pipeline");
          return;
        }

        if ("pipelineId" in pipelineResult) {
          setPipelineId(pipelineResult.pipelineId);
        }
      };

      reader.onerror = () => {
        setUploadError("Failed to read file");
      };
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setTranscript(null);
    setUploadError(null);
    setPipelineId(null);
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

        {errorMessage && (
          <div className="max-w-6xl mx-auto px-4 pt-8">
            <div className="border border-red-200 bg-red-50 rounded-sm p-4">
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          </div>
        )}

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

                  <div>
                    <h3 className="text-sm font-medium text-neutral-700 mb-3">
                      Your Notes
                    </h3>
                    <div className="border border-neutral-200 rounded-sm p-4 min-h-[200px] bg-neutral-50/30">
                      {isMounted && (
                        <NoteEditor
                          initialContent={noteContent}
                          handleChange={setNoteContent}
                          mentionConfig={mentionConfig}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-serif font-medium mb-2">
                  Final Result
                </h2>
                <p className="text-sm text-neutral-600">
                  Combined notes with transcript
                </p>
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
                    transcript={transcript}
                    isProcessing={isProcessing}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
