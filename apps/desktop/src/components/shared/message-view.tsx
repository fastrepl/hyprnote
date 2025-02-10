import { cn } from "@hypr/ui/lib/utils";
import LoadingDots from "./loading-dots";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
}

interface MessageViewProps {
  messages: Message[];
  isLoading: boolean;
  isDynamic: boolean;
  messageContainerRef: React.RefObject<HTMLDivElement>;
}

export default function MessageView({
  messages,
  isLoading,
  isDynamic,
  messageContainerRef,
}: MessageViewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4" ref={messageContainerRef}>
      {messages.length === 0 ? (
        <div className="space-y-2">
          <div className="w-fit overflow-clip rounded-full border bg-neutral-50 p-1">
            <img
              src={isDynamic ? "/assets/dynamic.gif" : "/assets/static.png"}
              alt="AI Assistant"
              className="size-10"
            />
          </div>
          <div className="text-gray-900">
            Hi John / Nemo Toys! How can I help you today?
          </div>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "mb-4 flex",
              message.sender === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-4 py-2 text-sm",
                message.sender === "user"
                  ? "bg-neutral-100 text-black"
                  : "border text-gray-900",
              )}
            >
              {message.text}
            </div>
          </div>
        ))
      )}
      {isLoading && (
        <div className="mb-4 flex justify-start">
          <div className="max-w-[85%] rounded-lg px-4 py-2 text-gray-900">
            <LoadingDots />
          </div>
        </div>
      )}
    </div>
  );
}
