import { cn } from "@hypr/utils";

type Status =
  | "idle"
  | "uploading"
  | "queued"
  | "transcribing"
  | "done"
  | "error";

const statusMessages: Record<Status, string> = {
  idle: "Upload an audio file to see the transcript",
  uploading: "Uploading audio file...",
  queued: "Queued for transcription...",
  transcribing: "Transcribing audio...",
  done: "",
  error: "",
};

export function TranscriptDisplay({
  transcript,
  status,
  error,
}: {
  transcript: string | null;
  status: Status;
  error?: string | null;
}) {
  if (status === "error" && error) {
    return (
      <div className="border border-red-200 bg-red-50 rounded-sm p-8 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const isProcessing =
    status === "uploading" || status === "queued" || status === "transcribing";

  if (isProcessing) {
    return (
      <div className="border border-neutral-200 rounded-sm p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-600" />
          <p className="text-neutral-600">{statusMessages[status]}</p>
        </div>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="border border-neutral-200 rounded-sm p-8 text-center">
        <p className="text-neutral-500">{statusMessages.idle}</p>
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 rounded-sm p-6">
      <div className="prose prose-sm max-w-none">
        <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">
          {transcript}
        </p>
      </div>
    </div>
  );
}

export function FileInfo({
  fileName,
  fileSize,
  onRemove,
}: {
  fileName: string;
  fileSize: number;
  onRemove: () => void;
}) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={cn([
        "flex items-center justify-between",
        "border border-neutral-200 rounded-sm p-4",
        "bg-stone-50/30",
      ])}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-700 truncate">
          {fileName}
        </p>
        <p className="text-xs text-neutral-500">{formatSize(fileSize)}</p>
      </div>
      <button
        onClick={onRemove}
        className="ml-4 px-3 py-1 text-sm text-neutral-600 hover:text-neutral-800 border border-neutral-200 rounded-full hover:bg-neutral-50 transition-all"
      >
        Remove
      </button>
    </div>
  );
}
