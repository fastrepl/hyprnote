export interface MessagePart {
  type: "text" | "markdown";
  content: string;
  isComplete?: boolean;
}

export interface Message {
  id: string;
  content: string;
  parts?: MessagePart[];
  isUser: boolean;
  timestamp: Date;
  type: "text-delta" | "tool-start" | "tool-result" | "tool-error" | "generating";
}

export type ChatSession = {
  id: string;
  title: string;
  lastMessageDate: Date;
  messages: Message[];
};
