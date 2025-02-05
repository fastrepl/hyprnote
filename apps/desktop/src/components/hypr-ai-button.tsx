import { cn } from "@hypr/ui/lib/utils";
import { ArrowUpCircleIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
}

function LoadingDots() {
  return (
    <div className="flex gap-px">
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          times: [0, 0.2, 1],
        }}
      >
        .
      </motion.span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          times: [0, 0.2, 1],
          delay: 0.2,
        }}
      >
        .
      </motion.span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          times: [0, 0.2, 1],
          delay: 0.4,
        }}
      >
        .
      </motion.span>
    </div>
  );
}

export function HyprAIButton() {
  const [isDynamic, setIsDynamic] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsDynamic(true);

      const timeout = setTimeout(() => {
        setIsDynamic(false);
      }, 1625);

      return () => clearTimeout(timeout);
    }, 6625);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: "Hello World",
      sender: "assistant",
    };

    setMessages((prev) => [...prev, aiMessage]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="fixed bottom-7 right-7 z-50">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="button"
            onClick={() => setIsOpen(true)}
            className={cn(
              "flex items-center justify-center overflow-clip rounded-full border border-border bg-white p-1 shadow-sm transition-transform hover:scale-105",
            )}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <img
              src={isDynamic ? "/assets/dynamic.gif" : "/assets/static.png"}
              alt="Help"
              className="size-9"
            />
          </motion.button>
        ) : (
          <motion.div
            key="modal"
            initial={{ width: 56, height: 56, opacity: 0 }}
            animate={{
              width: 420,
              height: "auto",
              opacity: 1,
              transition: {
                width: { duration: 0.2, ease: "easeOut" },
                height: { duration: 0.2, ease: "easeOut" },
                opacity: { duration: 0.1, delay: 0.1 },
              },
            }}
            exit={{
              width: 56,
              height: 56,
              opacity: 0,
              transition: {
                width: { duration: 0.2, ease: "easeIn" },
                height: { duration: 0.2, ease: "easeIn" },
                opacity: { duration: 0.1 },
              },
            }}
            className="flex origin-bottom-right flex-col rounded-xl border bg-white shadow-lg"
            style={{ maxHeight: "min(80vh, 720px)", height: "80vh" }}
          >
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <div className="overflow-clip rounded-full border border-border p-1">
                  <img
                    src={
                      isDynamic ? "/assets/dynamic.gif" : "/assets/static.png"
                    }
                    alt="AI Assistant"
                    className="size-9"
                  />
                </div>
                <h3 className="text-sm font-medium">Hypr AI</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-4"
                >
                  <path
                    d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="text-gray-900">
                  Hi John / Nemo Toys! How can I help you today?
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "mb-4 flex",
                      message.sender === "user"
                        ? "justify-end"
                        : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-4 py-2",
                        message.sender === "user"
                          ? "bg-neutral-100 text-black"
                          : "text-gray-900",
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

            <form onSubmit={handleSubmit}>
              <div className="relative mx-4 mb-4 flex flex-col gap-3">
                {!inputValue.trim() && messages.length === 0 && (
                  <div className="flex flex-wrap gap-2 px-1">
                    {[
                      "List action items",
                      "Write follow-up email",
                      "List Q&A",
                    ].map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => setInputValue(action)}
                        className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm text-neutral-900 hover:bg-neutral-200"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative flex items-end rounded-lg border bg-white">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything or select..."
                    className="min-h-[44px] w-full resize-none rounded-lg bg-transparent px-3 py-[10px] pr-12 outline-none"
                    rows={1}
                  />
                  <button
                    type="submit"
                    className={cn(
                      "absolute bottom-1.5 right-1.5 rounded-md p-1.5 transition-colors",
                      inputValue.trim()
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "hover:bg-gray-100",
                    )}
                    disabled={!inputValue.trim()}
                  >
                    <ArrowUpCircleIcon className="size-5" />
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
