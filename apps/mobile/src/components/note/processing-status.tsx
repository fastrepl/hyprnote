import "../../styles/processing-status.css";

import { type Session } from "@hypr/plugin-db";
import { EarIcon, FileTextIcon, MicIcon, SparklesIcon, UploadIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface ProcessingStatusProps {
  session: Session;
  noteStatus: "listening" | "uploading" | "transcribing" | "enhancing" | null;
  audioLevel?: number;
}

export function ProcessingStatus({
  session,
  noteStatus,
  audioLevel: externalAudioLevel,
}: ProcessingStatusProps) {
  const [mockAudioLevel, setMockAudioLevel] = useState(30);

  const audioLevel = externalAudioLevel !== undefined ? externalAudioLevel : mockAudioLevel;

  const getPulseClass = () => {
    if (noteStatus !== "listening") return "";

    if (audioLevel < 30) return "pulse-low";
    if (audioLevel < 70) return "pulse-medium";
    return "pulse-high";
  };

  useEffect(() => {
    if (noteStatus !== "listening") return;

    const interval = setInterval(() => {
      const newLevel = Math.floor(Math.random() * 80) + 10;
      setMockAudioLevel(newLevel);
    }, 1000);

    return () => clearInterval(interval);
  }, [noteStatus]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            noteStatus === "listening" ? `bg-red-500 ${getPulseClass()}` : "bg-neutral-700"
          }`}
        >
          {noteStatus === "listening" && <EarIcon size={32} className="text-neutral-100" />}
          {noteStatus === "uploading" && <UploadIcon size={32} className="text-neutral-100" />}
          {noteStatus === "transcribing" && <FileTextIcon size={32} className="text-neutral-100" />}
          {noteStatus === "enhancing" && <SparklesIcon size={32} className="text-neutral-100" />}
          {!noteStatus && <MicIcon size={32} className="text-neutral-100" />}
        </div>
        <h3 className="text-neutral-600 text-lg font-medium mb-2">
          {noteStatus === "listening" && "Listening..."}
          {noteStatus === "uploading" && "Uploading recording..."}
          {noteStatus === "transcribing" && "Transcribing audio..."}
          {noteStatus === "enhancing" && "Enhancing notes..."}
          {!noteStatus && (session.audio_local_path ? "Processing recording..." : "Listening...")}
        </h3>
        <p className="text-neutral-400 max-w-xs">
          {noteStatus === "listening"
            && "Recording in progress. The transcript and notes will be available once the recording is complete."}
          {noteStatus === "uploading"
            && "Uploading your audio file. This should only take a moment."}
          {noteStatus === "transcribing"
            && "Converting speech to text. This may take a few minutes depending on the length of your recording."}
          {noteStatus === "enhancing"
            && "Applying AI enhancements to organize and structure your notes for better readability."}
          {!noteStatus && (session.audio_local_path
            ? "We're analyzing your recording to generate notes and transcript. This may take a moment."
            : "Recording in progress. The transcript and notes will be available once the recording is complete.")}
        </p>
      </div>
    </div>
  );
}
