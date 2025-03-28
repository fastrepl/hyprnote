export const formatDate = (date: Date) => {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    if (weeks > 0) {
      return `${weeks}w`;
    }
    return `${diffDays}d`;
  } else {
    const month = date.toLocaleString("default", { month: "short" });
    const day = date.getDate();

    if (date.getFullYear() === now.getFullYear()) {
      return `${month} ${day}`;
    }
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  }
};

// Mock chat history data for development
export const getMockChatHistory = () => [
  {
    id: "1",
    title: "New chat",
    lastMessageDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    messages: [],
  },
  {
    id: "2",
    title: "New chat",
    lastMessageDate: new Date(2025, 1, 13),
    messages: [],
  },
  {
    id: "3",
    title: "Summarize Hyprnote AI",
    lastMessageDate: new Date(2025, 1, 5),
    messages: [],
  },
  {
    id: "4",
    title: "New chat",
    lastMessageDate: new Date(2025, 1, 5),
    messages: [],
  },
  {
    id: "5",
    title: "New chat",
    lastMessageDate: new Date(2025, 1, 5),
    messages: [],
  },
  {
    id: "6",
    title: "New chat",
    lastMessageDate: new Date(2025, 0, 3),
    messages: [],
  },
  {
    id: "7",
    title: "New chat",
    lastMessageDate: new Date(2024, 11, 31),
    messages: [],
  },
];
