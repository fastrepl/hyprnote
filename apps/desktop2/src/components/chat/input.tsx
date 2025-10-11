import { SendIcon } from "lucide-react";
import { useState } from "react";

export function ChatMessageInput({
  onSendMessage,
  disabled,
}: {
  onSendMessage: (content: string, parts: any[]) => void;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || disabled) {
      return;
    }

    onSendMessage(inputValue, [{ type: "text", text: inputValue }]);
    setInputValue("");
  };

  return (
    <form
      className="p-4 border-t border-neutral-200 flex items-center gap-2"
      onSubmit={handleSubmit}
    >
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Ask & search about anything, or be creative!"
        disabled={disabled}
        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={!inputValue.trim() || disabled}
        className="text-neutral-500 hover:text-neutral-700 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <SendIcon className="size-4" />
      </button>
    </form>
  );
}
