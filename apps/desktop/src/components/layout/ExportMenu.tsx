import { useRef } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";

interface ExportMenuProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function ExportMenu({ isOpen, onToggle }: ExportMenuProps) {
  const exportRef = useRef<HTMLDivElement>(null);

  useClickOutside(exportRef, () => {
    if (isOpen) onToggle();
  });

  return (
    <div className="relative" ref={exportRef}>
      <button
        onClick={onToggle}
        className="rounded-md border px-2.5 py-2 text-xs text-gray-700 hover:bg-gray-100"
        aria-label={isOpen ? "Close export menu" : "Open export menu"}
      >
        Export
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border bg-white shadow-lg">
          <div className="py-1">
            <button
              onClick={() => {
                /* MD 다운로드 로직 */
                onToggle();
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Markdown으로 내보내기
            </button>
            <button
              onClick={() => {
                /* PDF 다운로드 로직 */
                onToggle();
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              PDF로 내보내기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
