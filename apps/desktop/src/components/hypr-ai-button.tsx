import { cn } from "@hypr/ui/lib/utils";
import {
  ArrowUpCircleIcon,
  HistoryIcon,
  PlusCircleIcon,
  XIcon,
} from "lucide-react";
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
  const [showHistory, setShowHistory] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chatHistory = [
    { id: "1", title: "Summarize Hyprnote AI", time: "3m" },
    { id: "2", title: "New chat", time: "24m" },
    { id: "3", title: "New chat", time: "47m" },
    { id: "4", title: "New chat", time: "Jan 3" },
    { id: "5", title: "New chat", time: "12/31/2024" },
    { id: "6", title: "계약 양도 가능성", time: "12/05/2024" },
  ];

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

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = "44px";
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.min(scrollHeight, 200) + "px";
    };

    adjustHeight();
  }, [inputValue]);

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
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="button"
            onClick={() => setIsOpen(true)}
            className={cn(
              "flex items-center justify-center overflow-clip rounded-full border bg-white p-1 shadow-sm transition-transform hover:scale-105",
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
            <div className="flex items-center justify-between px-4 py-2">
              {showHistory ? (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 hover:bg-gray-100"
                      onClick={() => setShowHistory(false)}
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
                          d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z"
                          fill="currentColor"
                          fillRule="evenodd"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <div className="text-sm font-medium">All chats</div>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-neutral-500 hover:text-neutral-900"
                  >
                    New chat
                  </button>
                </>
              ) : (
                <>
                  <div className="text-sm font-medium">Note Chat</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 hover:bg-gray-100"
                      onClick={() => {
                        setMessages([]);
                        setInputValue("");
                      }}
                    >
                      <PlusCircleIcon className="size-4" />
                    </button>

                    <button
                      type="button"
                      className="rounded-lg p-1.5 hover:bg-gray-100"
                      onClick={() => setShowHistory(true)}
                    >
                      <HistoryIcon className="size-4" />
                    </button>

                    <button
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg p-1.5 hover:bg-gray-100"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {showHistory ? (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-6">
                  <input
                    type="text"
                    placeholder="Search or start new chat"
                    className="w-full rounded-lg border bg-neutral-50 px-3 py-2 text-sm placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <div className="mb-3 text-xs font-medium text-neutral-500">
                    Today
                  </div>
                  {chatHistory.slice(0, 3).map((chat) => (
                    <button
                      key={chat.id}
                      className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-neutral-100"
                      onClick={() => {
                        setShowHistory(false);
                        // TODO: Load chat history
                      }}
                    >
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full border">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 15 15"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="size-4"
                        >
                          <path
                            d="M12.5 3L2.5 3.00002C1.67157 3.00002 1 3.67159 1 4.50002V9.50003C1 10.3285 1.67157 11 2.5 11H7.50003C7.63264 11 7.75982 11.0527 7.85358 11.1465L10 13.2929V11.5C10 11.2239 10.2239 11 10.5 11H12.5C13.3284 11 14 10.3285 14 9.50003V4.5C14 3.67157 13.3284 3 12.5 3ZM2.49999 2.00002L12.5 2C13.8807 2 15 3.11929 15 4.5V9.50003C15 10.8807 13.8807 12 12.5 12H11V14.5C11 14.7022 10.8782 14.8845 10.6913 14.9619C10.5045 15.0393 10.2894 14.9965 10.1464 14.8536L7.29292 12H2.5C1.11929 12 0 10.8807 0 9.50003V4.50002C0 3.11931 1.11928 2.00002 2.49999 2.00002Z"
                            fill="currentColor"
                            fillRule="evenodd"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 truncate text-left">
                        <div className="text-sm">{chat.title}</div>
                        <div className="text-xs text-neutral-500">
                          {chat.time}
                        </div>
                      </div>
                    </button>
                  ))}
                  <div className="mb-3 mt-6 text-xs font-medium text-neutral-500">
                    Older
                  </div>
                  {chatHistory.slice(3).map((chat) => (
                    <button
                      key={chat.id}
                      className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-neutral-100"
                      onClick={() => {
                        setShowHistory(false);
                        // TODO: Load chat history
                      }}
                    >
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full border">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 15 15"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="size-4"
                        >
                          <path
                            d="M12.5 3L2.5 3.00002C1.67157 3.00002 1 3.67159 1 4.50002V9.50003C1 10.3285 1.67157 11 2.5 11H7.50003C7.63264 11 7.75982 11.0527 7.85358 11.1465L10 13.2929V11.5C10 11.2239 10.2239 11 10.5 11H12.5C13.3284 11 14 10.3285 14 9.50003V4.5C14 3.67157 13.3284 3 12.5 3ZM2.49999 2.00002L12.5 2C13.8807 2 15 3.11929 15 4.5V9.50003C15 10.8807 13.8807 12 12.5 12H11V14.5C11 14.7022 10.8782 14.8845 10.6913 14.9619C10.5045 15.0393 10.2894 14.9965 10.1464 14.8536L7.29292 12H2.5C1.11929 12 0 10.8807 0 9.50003V4.50002C0 3.11931 1.11928 2.00002 2.49999 2.00002Z"
                            fill="currentColor"
                            fillRule="evenodd"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 truncate text-left">
                        <div className="text-sm">{chat.title}</div>
                        <div className="text-xs text-neutral-500">
                          {chat.time}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="space-y-2">
                    <div className="w-fit overflow-clip rounded-full border p-1">
                      <img
                        src={
                          isDynamic
                            ? "/assets/dynamic.gif"
                            : "/assets/static.png"
                        }
                        alt="AI Assistant"
                        className="size-9"
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
            )}
            {!showHistory && (
              <form onSubmit={handleSubmit}>
                <div className="relative mx-4 mb-4 flex flex-col gap-3">
                  {messages.length === 0 && (
                    <div className="flex flex-wrap gap-2 px-1">
                      {[
                        "List action items",
                        "Write follow-up email",
                        "List Q&A",
                      ].map((action) => (
                        <button
                          key={action}
                          type="button"
                          onClick={() => {
                            const userMessage: Message = {
                              id: Date.now().toString(),
                              text: action,
                              sender: "user",
                            };
                            setMessages((prev) => [...prev, userMessage]);
                            setIsLoading(true);
                            setTimeout(() => {
                              const aiMessage: Message = {
                                id: (Date.now() + 1).toString(),
                                text: "Hello World",
                                sender: "assistant",
                              };
                              setMessages((prev) => [...prev, aiMessage]);
                              setIsLoading(false);
                            }, 2000);
                          }}
                          className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm text-neutral-900 hover:bg-neutral-200"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="relative flex flex-1 items-end rounded-lg border bg-white">
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything or select..."
                      className="min-h-[44px] w-full resize-none rounded-lg bg-transparent px-3 py-[10px] pr-12 outline-none focus:ring-2 focus:ring-blue-500"
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
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
