import { motion } from "motion/react";
import { Message } from "./types";
import Header from "./header";
import HistoryView from "./history-view";
import MessageView from "./message-view";
import MessageInput from "./message-input";

interface ModalProps {
  showHistory: boolean;
  pathname: string;
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
  pathname,
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
  return (
    <motion.div
      key="modal"
      initial={{ width: 56, height: 56, opacity: 0 }}
      animate={{
        width: 420,
        height: "auto",
        opacity: 1,
        transition: {
          width: { duration: 0.15, ease: "easeOut" },
          height: { duration: 0.15, ease: "easeOut" },
          opacity: { duration: 0.1, delay: 0.05 },
        },
      }}
      exit={{
        width: 56,
        height: 56,
        opacity: 0,
        transition: {
          width: { duration: 0.15, ease: "easeIn" },
          height: { duration: 0.15, ease: "easeIn" },
          opacity: { duration: 0.1 },
        },
      }}
      className="flex origin-bottom-right flex-col rounded-xl border bg-white shadow-2xl transition-[height] duration-200"
      style={{
        maxHeight: "80vh",
        minHeight: 400,
      }}
    >
      <Header
        showHistory={showHistory}
        pathname={pathname}
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
