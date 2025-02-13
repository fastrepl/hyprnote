import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";

import TriggerButton from "@/components/shared/trigger-button";
import { useAITrigger } from "@/hooks/use-ai-trigger";
import type { Message } from "@/types";

import Modal from "./shared/modal";

export default function WorkspaceAIButton() {
  const { isDynamic, isOpen, setIsOpen, handleOpen } = useAITrigger();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  const chatHistory = [
    { id: "1", title: "Summarize Hyprnote AI", time: "3m" },
    { id: "2", title: "New chat", time: "24m" },
    { id: "3", title: "New chat", time: "47m" },
    { id: "4", title: "New chat", time: "Jan 3" },
    { id: "5", title: "New chat", time: "12/31/2024" },
    { id: "6", title: "계약 양도 가능성", time: "12/05/2024" },
  ];

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

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop =
        messageContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // mod+J to toggle
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // esc to close
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

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
      if (!isLoading && inputValue.trim()) {
        handleSubmit(e);
      }
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-10">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <TriggerButton isDynamic={isDynamic} onClick={handleOpen} />
        ) : (
          <Modal
            showHistory={showHistory}
            messages={messages}
            inputValue={inputValue}
            isLoading={isLoading}
            isDynamic={isDynamic}
            messageContainerRef={messageContainerRef}
            inputRef={inputRef}
            chatHistory={chatHistory}
            onBackClick={() => setShowHistory(false)}
            onNewChat={() => {
              setMessages([]);
              setInputValue("");
            }}
            onHistoryClick={() => setShowHistory(true)}
            onCloseClick={() => setIsOpen(false)}
            onChatSelect={() => {
              setShowHistory(false);
              // TODO: Load chat history
            }}
            onSubmit={handleSubmit}
            onInputChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onQuickAction={(action) => {
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}
