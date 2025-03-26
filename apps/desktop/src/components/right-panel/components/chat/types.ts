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
