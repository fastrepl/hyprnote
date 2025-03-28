import { BadgeType } from "../../components/chat";

export type Message = {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
};

export type ChatSession = {
  id: string;
  title: string;
  lastMessageDate: Date;
  messages: Message[];
};

export interface ActiveNoteInfo {
  id: string;
  title: string;
}

export interface ActiveEntityInfo {
  id: string;
  name: string;
  type: BadgeType;
}

export interface ChatViewProps {
  onNewChat?: () => void;
  onViewHistory?: () => void;
}
