import { type ChangeEvent, type KeyboardEvent } from "react";

interface TitleInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onNavigateToEditor?: () => void;
}

export default function TitleInput({
  value,
  onChange,
  onNavigateToEditor,
}: TitleInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      onNavigateToEditor?.();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onNavigateToEditor?.();

      setTimeout(() => {
        const editorContent = document.querySelector(".ProseMirror");
        if (editorContent && editorContent instanceof HTMLElement) {
          const range = document.createRange();
          const selection = window.getSelection();

          let firstNode = editorContent.firstChild;
          while (firstNode && firstNode.nodeType !== Node.TEXT_NODE && firstNode.nodeType !== Node.ELEMENT_NODE) {
            firstNode = firstNode.nextSibling;
          }

          if (firstNode) {
            range.setStart(firstNode, 0);
            range.collapse(true);

            if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      }, 0);
    }
  };

  return (
    <input
      id="note-title-input"
      type="text"
      onChange={onChange}
      value={value}
      placeholder="Untitled"
      className="w-full border-none bg-transparent text-2xl font-bold focus:outline-none"
      onKeyDown={handleKeyDown}
    />
  );
}
