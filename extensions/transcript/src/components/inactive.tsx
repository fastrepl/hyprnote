interface InactiveProps {
  sessionId: string | null | undefined;
  showEmptyMessage: boolean;
  isEnhanced: boolean;
}

export default function Inactive({
  sessionId,
  showEmptyMessage,
  isEnhanced,
}: InactiveProps) {
  if (!sessionId) {
    return (
      <div className="absolute inset-0 backdrop-blur-sm bg-white/50 flex items-center justify-center z-10">
        <div className="text-neutral-500 font-medium">Session not found</div>
      </div>
    );
  }

  if (showEmptyMessage) {
    return (
      <div className="absolute inset-0 backdrop-blur-sm bg-white/50 flex items-center justify-center z-10 rounded-2xl">
        <div className="text-neutral-500 font-medium">
          {isEnhanced
            ? "No transcript available"
            : "Meeting is not active"}
        </div>
      </div>
    );
  }

  return null;
}
