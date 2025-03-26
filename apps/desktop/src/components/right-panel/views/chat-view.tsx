import { Trans } from "@lingui/react/macro";
import { ArrowUpIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";

type Message = {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
};

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation effect for the AI icon
  useEffect(() => {
    const animationInterval = setInterval(() => {
      setIsAnimating(true);
      const timeout = setTimeout(() => {
        setIsAnimating(false);
      }, 1625);
      return () => clearTimeout(timeout);
    }, 4625);

    return () => clearInterval(animationInterval);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Set minimum height to 40px (one line) and expand if needed
    const baseHeight = 40; // matches min-h-[40px]
    const newHeight = Math.max(textarea.scrollHeight, baseHeight);
    textarea.style.height = `${newHeight}px`;
  }, [inputValue]);

  // Set initial height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "40px";
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Simulate AI response (would be replaced with actual API call)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "This is a sample response from the AI assistant.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt);
    // Focus the textarea
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {messages.length === 0
        ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className="relative w-16 aspect-square flex items-center justify-center">
              <img
                src={isAnimating ? "/assets/dynamic.gif" : "/assets/static.png"}
                alt="Chat Assistant"
                className="w-full h-full"
              />
            </div>
            <h3 className="text-lg font-medium mb-4">
              <Trans>Hyprnote Assistant</Trans>
            </h3>
            <div className="flex flex-wrap gap-2 justify-center mb-4 max-w-[280px]">
              <button
                onClick={() => handleQuickAction("Summarize this meeting")}
                className="text-xs px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <Trans>Summarize meeting</Trans>
              </button>
              <button
                onClick={() => handleQuickAction("Identify key decisions made in this meeting")}
                className="text-xs px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <Trans>Key decisions</Trans>
              </button>
              <button
                onClick={() => handleQuickAction("Extract action items from this meeting")}
                className="text-xs px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <Trans>Extract action items</Trans>
              </button>
              <button
                onClick={() => handleQuickAction("Create an agenda for next meeting")}
                className="text-xs px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <Trans>Create agenda</Trans>
              </button>
            </div>
          </div>
        )
        : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="w-full mb-4"
              >
                <div
                  className={cn(
                    "font-semibold text-xs mb-1",
                    message.isUser ? "text-neutral-700" : "text-amber-700",
                  )}
                >
                  {message.isUser ? <Trans>User:</Trans> : <Trans>Assistant:</Trans>}
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

      <div className="pb-4 px-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full resize-none overflow-hidden rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[120px]"
            rows={1}
          />
          <Button
            size="icon"
            className="absolute right-2 bottom-2 h-6 w-6"
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
          >
            <ArrowUpIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
