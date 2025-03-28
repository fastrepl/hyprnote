import { useMatch, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { BadgeType, Message } from "@/components/right-panel/components/chat";
import { useSession } from "@/contexts";
import { commands as dbCommands } from "@hypr/plugin-db";

interface ActiveNoteInfo {
  id: string;
  title: string;
}

interface ActiveEntityInfo {
  id: string;
  name: string;
  type: BadgeType;
}

export function useChat() {
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Entity state
  const [activeNote, setActiveNote] = useState<ActiveNoteInfo | null>(null);
  const [activeEntity, setActiveEntity] = useState<ActiveEntityInfo | null>(null);
  const [chatSourceEntity, setChatSourceEntity] = useState<ActiveEntityInfo | null>(null);

  // Derived state
  const hasActiveChat = messages.length > 0;

  // Reference to track entity changes
  const previousEntityRef = useRef<string | null>(null);

  // Router hooks
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const humanMatch = useMatch({ from: "/app/human/$id", shouldThrow: false });
  const organizationMatch = useMatch({ from: "/app/organization/$id", shouldThrow: false });
  const navigate = useNavigate();

  // Get note session if on a note page
  const noteId = noteMatch?.status === "success" && noteMatch.params.id;
  const sessionStore = noteId
    ? useSession(noteId, (s) => ({
      session: s.session,
    }))
    : null;

  // Update active entity when route changes
  useEffect(() => {
    const updateActiveEntity = async () => {
      let newEntity: ActiveEntityInfo | null = null;

      if (noteMatch?.status === "success" && noteMatch.params.id) {
        try {
          const noteId = noteMatch.params.id;

          if (!activeNote || activeNote.id !== noteId) {
            setActiveNote({
              id: noteId,
              title: "Untitled",
            });
          }

          if (sessionStore?.session?.title) {
            setActiveNote(prev => ({
              ...prev!,
              title: sessionStore.session.title || "Untitled",
            }));
          }

          newEntity = {
            id: noteId,
            name: sessionStore?.session?.title || "Untitled",
            type: "note",
          };
        } catch (error) {
          console.error("Error updating note:", error);
        }
      } else if (humanMatch?.status === "success" && humanMatch.params.id) {
        try {
          const humanId = humanMatch.params.id;
          const human = await dbCommands.getHuman(humanId);

          if (human) {
            newEntity = {
              id: humanId,
              name: human.full_name || "Unknown Contact",
              type: "human",
            };
          }
        } catch (error) {
          console.error("Error fetching human data:", error);
        }
      } else if (organizationMatch?.status === "success" && organizationMatch.params.id) {
        try {
          const orgId = organizationMatch.params.id;
          const organization = await dbCommands.getOrganization(orgId);

          if (organization) {
            newEntity = {
              id: orgId,
              name: organization.name || "Unknown Organization",
              type: "organization",
            };
          }
        } catch (error) {
          console.error("Error fetching organization data:", error);
        }
      }

      if (newEntity) {
        previousEntityRef.current = newEntity.id;
        setActiveEntity(newEntity);

        if (messages.length === 0 && !chatSourceEntity) {
          setChatSourceEntity(newEntity);
        }
      }
    };

    updateActiveEntity();
  }, [noteMatch, humanMatch, organizationMatch, sessionStore, activeNote, messages.length, chatSourceEntity]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    if (messages.length === 0 && activeEntity && !chatSourceEntity) {
      setChatSourceEntity(activeEntity);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "This is a sample response from the AI assistant.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);

    document.querySelector("textarea")?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = (prompt: string) => {
    if (messages.length === 0 && activeEntity && !chatSourceEntity) {
      setChatSourceEntity(activeEntity);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: prompt,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "This is a sample response from the AI assistant.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);

    document.querySelector("textarea")?.focus();
  };

  const handleFocusInput = () => {
    document.querySelector("textarea")?.focus();
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputValue("");
    setShowHistory(false);
    setChatSourceEntity(null);
  };

  const handleViewHistory = () => {
    setShowHistory(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleSelectChat = (chatId: string) => {
    console.log(`Selected chat: ${chatId}`);
    setShowHistory(false);
  };

  const handleBackToChat = () => {
    setShowHistory(false);
  };

  const handleNoteBadgeClick = () => {
    if (chatSourceEntity) {
      if (chatSourceEntity.type === "note") {
        navigate({ to: `/app/note/$id`, params: { id: chatSourceEntity.id } });
      } else if (chatSourceEntity.type === "human") {
        navigate({ to: `/app/human/$id`, params: { id: chatSourceEntity.id } });
      } else if (chatSourceEntity.type === "organization") {
        navigate({ to: `/app/organization/$id`, params: { id: chatSourceEntity.id } });
      }
    } else if (activeEntity) {
      if (activeEntity.type === "note") {
        navigate({ to: `/app/note/$id`, params: { id: activeEntity.id } });
      } else if (activeEntity.type === "human") {
        navigate({ to: `/app/human/$id`, params: { id: activeEntity.id } });
      } else if (activeEntity.type === "organization") {
        navigate({ to: `/app/organization/$id`, params: { id: activeEntity.id } });
      }
    }
  };

  const formatDate = (date: Date) => {
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

  return {
    // State
    messages,
    inputValue,
    showHistory,
    searchValue,
    activeNote,
    activeEntity,
    chatSourceEntity,
    hasActiveChat,

    // Handlers
    handleInputChange,
    handleSubmit,
    handleKeyDown,
    handleQuickAction,
    handleFocusInput,
    handleNewChat,
    handleViewHistory,
    handleSearchChange,
    handleSelectChat,
    handleBackToChat,
    handleNoteBadgeClick,
    formatDate,
  };
}
