interface RawNoteProps {
  content: string;
}

export function RawNote({ content }: RawNoteProps) {
  return (
    <div className="p-6 relative bg-white h-[400px] overflow-y-auto max-w-none text-left text-sm">
      <div className="whitespace-pre-wrap">{content}</div>

      {/* Recording Indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-record-blink" />
        <span className="text-xs text-red-500">Recording</span>
      </div>
    </div>
  );
}
