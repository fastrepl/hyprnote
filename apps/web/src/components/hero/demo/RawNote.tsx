interface RawNoteProps {
  content: string;
}

export function RawNote({ content }: RawNoteProps) {
  return (
    <div className="p-6 relative bg-white h-[400px]">
      <div className="text-sm whitespace-pre-wrap text-left h-full overflow-y-auto">
        {content}
        <span className="inline-block w-0.5 h-5 bg-black animate-[blink_1s_steps(1)_infinite] ml-0.5" />
      </div>

      {/* Recording Indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-record-blink" />
        <span className="text-xs text-red-500">Recording</span>
      </div>
    </div>
  );
}
