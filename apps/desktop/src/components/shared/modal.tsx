import { motion } from "motion/react";
import type { Message } from "@/types";
import { useLocation } from "@tanstack/react-router";
import Header from "./header";
import HistoryView from "./history-view";
import MessageView from "./message-view";
import MessageInput from "./message-input";

interface ModalProps {
  showHistory: boolean;
  messages: Message[];
  inputValue: string;
  isLoading: boolean;
  isDynamic: boolean;
  messageContainerRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  chatHistory: Array<{ id: string; title: string; time: string }>;
  onBackClick: () => void;
  onNewChat: () => void;
  onHistoryClick: () => void;
  onCloseClick: () => void;
  onChatSelect: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onQuickAction: (action: string) => void;
}

export default function Modal({
  showHistory,
  messages,
  inputValue,
  isLoading,
  isDynamic,
  messageContainerRef,
  inputRef,
  chatHistory,
  onBackClick,
  onNewChat,
  onHistoryClick,
  onCloseClick,
  onChatSelect,
  onSubmit,
  onInputChange,
  onKeyDown,
  onQuickAction,
}: ModalProps) {
  const { pathname } = useLocation();

  return (
    <motion.div
      key="modal"
      initial={{ width: 56, height: 56, opacity: 0, y: 20 }}
      animate={{
        width: 420,
        height: "auto",
        opacity: 1,
        y: 0,
        transition: {
          width: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
          height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
          opacity: { duration: 0.2 },
          y: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
        },
      }}
      exit={{
        width: 56,
        height: 56,
        opacity: 0,
        y: 20,
        transition: {
          width: { duration: 0.2, ease: [0.4, 0, 1, 1] },
          height: { duration: 0.2, ease: [0.4, 0, 1, 1] },
          opacity: { duration: 0.15 },
          y: { duration: 0.2, ease: [0.4, 0, 1, 1] },
        },
      }}
      className="flex origin-bottom-right flex-col rounded-xl border bg-white shadow-2xl transition-[height] duration-200"
      style={{
        maxHeight: "80vh",
        minHeight: 240,
      }}
    >
      <Header
        title={pathname.includes("note") ? "Note Chat" : "Workspace Chat"}
        showHistory={showHistory}
        onBackClick={onBackClick}
        onNewChat={onNewChat}
        onHistoryClick={onHistoryClick}
        onCloseClick={onCloseClick}
      />
      {showHistory ? (
        <HistoryView chatHistory={chatHistory} onChatSelect={onChatSelect} />
      ) : (
        <>
          <MessageView
            messages={messages}
            isLoading={isLoading}
            isDynamic={isDynamic}
            messageContainerRef={messageContainerRef}
          />
          <MessageInput
            messages={messages}
            inputValue={inputValue}
            isLoading={isLoading}
            inputRef={inputRef}
            quickActions={
              pathname.includes("note")
                ? ["List action items", "Write follow-up email", "List Q&A"]
                : ["List action items", "Recap last meeting", "Summarize today"]
            }
            onSubmit={onSubmit}
            onInputChange={onInputChange}
            onKeyDown={onKeyDown}
            onQuickAction={onQuickAction}
          />
        </>
      )}
    </motion.div>
  );
}
