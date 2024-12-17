import { useRef, useState } from "react";
import {
  RiShareLine,
  RiFileCopyLine,
  RiFileTextLine,
  RiFileTextFill,
} from "@remixicon/react";

import { useClickOutside } from "../../hooks/useClickOutside";

export default function ExportMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useClickOutside(exportRef, () => {
    if (isOpen) {
      setIsOpen(false);
    }
  });

  return (
    <div className="relative" ref={exportRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
        aria-label={isOpen ? "Close export menu" : "Open export menu"}
      >
        <RiShareLine className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-white shadow-lg">
          <div className="py-1">
            <button
              onClick={() => {
                /* 클립보드 복사 로직 */
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              <RiFileCopyLine className="h-4 w-4" />
              클립보드에 복사
            </button>
            <button
              onClick={() => {
                /* MD 다운로드 로직 */
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              <RiFileTextLine className="h-4 w-4" />
              Markdown으로 내보내기
            </button>
            <button
              onClick={() => {
                /* PDF 다운로드 로직 */
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              <RiFileTextFill className="h-4 w-4" />
              PDF로 내보내기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
