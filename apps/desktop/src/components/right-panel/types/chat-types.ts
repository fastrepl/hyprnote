import type { ChatSession, Message, MessagePart } from "../components/chat/types";

export interface ActiveEntityInfo {
  id: string;
  type: BadgeType;
}

export type BadgeType = "note" | "human" | "organization";

export interface ChatState {
  messages: Message[];
  inputValue: string;
  showHistory: boolean;
  searchValue: string;
  hasChatStarted: boolean;
  isGenerating: boolean;
  currentChatGroupId: string | null;
}

export type { ChatSession, Message, MessagePart };
