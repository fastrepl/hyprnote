import { useEffect, useRef, useState } from "react";

interface LiveCaptionDockProps {
  currentTranscript: string;
}

export default function LiveCaptionDock({
  currentTranscript,
}: LiveCaptionDockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!currentTranscript) return;

    // 새로운 텍스트가 들어오면 lines 배열에 추가
    setLines((prev) => {
      const newLines = [...prev];
      if (currentTranscript !== newLines[newLines.length - 1]) {
        newLines.push(currentTranscript);
      }
      // 최대 5개의 최근 라인만 유지
      return newLines.slice(-5);
    });
  }, [currentTranscript]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 자동 스크롤
    container.scrollTop = container.scrollHeight;
  }, [lines]);

  return (
    <div className="absolute bottom-6 left-1/2 flex w-full max-w-xl -translate-x-1/2 flex-col items-center">
      <div
        ref={containerRef}
        className="h-11 w-full snap-y snap-mandatory overflow-y-auto rounded-lg bg-black/75 px-4 py-2 text-center text-sm text-white"
      >
        {lines.map((line, index) => (
          <div key={index} className="snap-start py-3">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
