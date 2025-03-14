import { type Session } from "@hypr/plugin-db";
import { formatTime, getMockTranscript } from "../../mock/transcript";

interface TranscriptProps {
  session: Session;
}

export function Transcript({ session }: TranscriptProps) {
  const transcript = getMockTranscript(session.id);

  return (
    <div className="pt-2 pb-6">
      {transcript.items.length > 0
        ? (
          transcript.items.map((item, index) => (
            <div key={index} className="mb-4 px-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-neutral-800 text-sm font-medium">
                  {item.speaker}
                </span>
                <span className="text-neutral-600 text-xs">
                  {formatTime(item.start)}
                </span>
              </div>
              <p className="text-black">{item.text}</p>
            </div>
          ))
        )
        : (
          <div className="px-4 py-8 text-center">
            <p className="text-neutral-600">No transcript data available</p>
          </div>
        )}
    </div>
  );
}
