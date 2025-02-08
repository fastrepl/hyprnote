import { cn } from "@hypr/ui/lib/utils";
import { ArrowUpCircleIcon } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
}

interface MessageInputProps {
  messages: Message[];
  inputValue: string;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onQuickAction: (action: string) => void;
}

export default function MessageInput({
  messages,
  inputValue,
  isLoading,
  inputRef,
  onSubmit,
  onInputChange,
  onKeyDown,
  onQuickAction,
}: MessageInputProps) {
  return (
    <form onSubmit={onSubmit}>
      <div className="relative mx-4 mb-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {["List action items", "Write follow-up email", "List Q&A"].map(
              (action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => onQuickAction(action)}
                  className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs text-neutral-900 hover:bg-neutral-200"
                >
                  {action}
                </button>
              ),
            )}
          </div>
        )}

        <div className="relative flex flex-1 items-end rounded-lg border bg-white">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            placeholder="Ask anything or select..."
            className="min-h-[44px] w-full resize-none rounded-lg bg-transparent px-3 py-[10px] pr-12 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            className={cn(
              "absolute bottom-1.5 right-1.5 rounded-md p-1.5 transition-colors",
              inputValue.trim()
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "hover:bg-gray-100",
              isLoading && "cursor-not-allowed opacity-50",
            )}
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? (
              <div className="size-5 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
            ) : (
              <ArrowUpCircleIcon className="size-5" />
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
