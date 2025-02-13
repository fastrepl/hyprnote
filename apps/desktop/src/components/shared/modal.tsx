import { useLocation } from "@tanstack/react-router";
import { motion } from "motion/react";

import type { Message } from "@/types";
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className="animate-fade-in flex origin-bottom-right flex-col rounded-xl border bg-white shadow-2xl"
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
                : ["What should I do?", "Recap last meeting", "Summarize today"]
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
