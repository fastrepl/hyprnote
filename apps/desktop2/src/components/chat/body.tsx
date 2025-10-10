import { MessageCircle } from "lucide-react";

export function ChatBody() {
  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="flex flex-col items-center justify-center h-full text-center">
        <MessageCircle className="w-12 h-12 text-neutral-300 mb-3" />
        <p className="text-neutral-600 text-sm mb-2">
          Ask the AI assistant about anything.
        </p>
        <p className="text-neutral-400 text-xs">
          It can also do few cool stuff for you.
        </p>
      </div>
    </div>
  );
}
