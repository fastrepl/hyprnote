import type { TranscriptBlock } from "../../types";

interface TranscriptPanelProps {
  transcript: string;
  timestamps?: TranscriptBlock[];
}

export default function TranscriptPanel({
  transcript,
  timestamps = [],
}: TranscriptPanelProps) {
  return (
    <div className="h-full overflow-y-auto p-4">
      {timestamps.length > 0 ? (
        <div className="space-y-2">
          {timestamps.map((block, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-blue-600">
                  {block.speaker}
                </span>
                <span className="text-gray-500">{block.timestamp}</span>
              </div>
              <div className="whitespace-pre-wrap rounded-2xl bg-gray-100 px-4 py-2">
                {block.text}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="whitespace-pre-wrap">{transcript}</div>
      )}
    </div>
  );
}
