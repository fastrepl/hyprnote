import { Button } from "@hypr/ui/components/ui/button";
import { ArrowUpIcon } from "lucide-react";
import { useEffect, useRef } from "react";

interface ChatInputProps {
  inputValue: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
}

export function ChatInput({ inputValue, onChange, onSubmit, onKeyDown, autoFocus = false }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";

    const baseHeight = 40;
    const newHeight = Math.max(textarea.scrollHeight, baseHeight);
    textarea.style.height = `${newHeight}px`;
  }, [inputValue]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "40px";
      if (autoFocus) {
        textarea.focus();
      }
    }
  }, [autoFocus]);

  return (
    <div className="pb-4 px-4">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Type a message..."
          className="w-full resize-none overflow-hidden rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[120px]"
          rows={1}
        />
        <Button
          size="icon"
          className="absolute right-2 bottom-2 h-6 w-6"
          onClick={onSubmit}
          disabled={!inputValue.trim()}
        >
          <ArrowUpIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
