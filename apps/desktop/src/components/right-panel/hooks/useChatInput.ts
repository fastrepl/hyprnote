import { useHypr } from "@/contexts";
import { useRightPanel } from "@hypr/utils/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as connectorCommands } from "@hypr/plugin-connector";
import { commands as dbCommands } from "@hypr/plugin-db";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

interface UseChatInputProps {
  entityId?: string;
  entityType?: "note" | "human" | "organization";
  onSubmit: (
    mentionedContent?: Array<{ id: string; type: string; label: string }>,
    selectionData?: any,
    htmlContent?: string,
  ) => void;
}

export function useChatInput({ entityId, entityType = "note", onSubmit }: UseChatInputProps) {
  const { userId } = useHypr();
  const { pendingSelection, clearPendingSelection } = useRightPanel();
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const lastBacklinkSearchTime = useRef<number>(0);

  // LLM Connection queries
  const llmConnectionQuery = useQuery({
    queryKey: ["llm-connection"],
    queryFn: () => connectorCommands.getLlmConnection(),
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
  });

  const customLlmModelQuery = useQuery({
    queryKey: ["custom-llm-model"],
    queryFn: () => connectorCommands.getCustomLlmModel(),
    enabled: llmConnectionQuery.data?.type === "Custom",
    refetchInterval: 5000,
  });

  const hyprCloudEnabledQuery = useQuery({
    queryKey: ["hypr-cloud-enabled"],
    queryFn: () => connectorCommands.getHyprcloudEnabled(),
    refetchInterval: 5000,
  });

  // Entity data queries
  const { data: noteData } = useQuery({
    queryKey: ["session", entityId],
    queryFn: async () => entityId ? dbCommands.getSession({ id: entityId }) : null,
    enabled: !!entityId && entityType === "note",
  });

  const { data: humanData } = useQuery({
    queryKey: ["human", entityId],
    queryFn: async () => entityId ? dbCommands.getHuman(entityId) : null,
    enabled: !!entityId && entityType === "human",
  });

  const { data: organizationData } = useQuery({
    queryKey: ["org", entityId],
    queryFn: async () => entityId ? dbCommands.getOrganization(entityId) : null,
    enabled: !!entityId && entityType === "organization",
  });

  // Computed values
  const entityTitle = (() => {
    if (!entityId) {
      return "";
    }
    switch (entityType) {
      case "note":
        return noteData?.title || "Untitled";
      case "human":
        return humanData?.full_name || "";
      case "organization":
        return organizationData?.name || "";
      default:
        return "";
    }
  })();

  const currentModelName = (() => {
    const connectionType = llmConnectionQuery.data?.type;
    const isHyprCloudEnabled = hyprCloudEnabledQuery.data;

    if (isHyprCloudEnabled) {
      return "HyprCloud";
    }

    switch (connectionType) {
      case "Custom":
        return customLlmModelQuery.data || "Custom Model";
      case "HyprLocal":
        return "Local LLM";
      default:
        return "Model";
    }
  })();

  // Handlers
  const handleMentionSearch = useCallback(async (query: string) => {
    const now = Date.now();
    const timeSinceLastEvent = now - lastBacklinkSearchTime.current;

    if (timeSinceLastEvent >= 5000) {
      analyticsCommands.event({
        event: "searched_backlink",
        distinct_id: userId,
      });
      lastBacklinkSearchTime.current = now;
    }

    const sessions = await dbCommands.listSessions({
      type: "search",
      query,
      user_id: userId,
      limit: 3,
    });

    const noteResults = sessions.map((s) => ({
      id: s.id,
      type: "note" as const,
      label: s.title || "Untitled Note",
    }));

    const humans = await dbCommands.listHumans({
      search: [3, query],
    });

    const peopleResults = humans
      .filter(h => h.full_name && h.full_name.toLowerCase().includes(query.toLowerCase()))
      .map((h) => ({
        id: h.id,
        type: "human" as const,
        label: h.full_name || "Unknown Person",
      }));

    return [...noteResults, ...peopleResults].slice(0, 5);
  }, [userId]);

  const processSelection = useCallback((selection: any) => {
    if (!selection) {
      return null;
    }

    const noteName = noteData?.title || humanData?.full_name || organizationData?.name || "Note";
    const selectedHtml = selection.text || "";

    // Strip HTML tags
    const temp = document.createElement("div");
    temp.innerHTML = selectedHtml;
    const selectedText = (temp.textContent || temp.innerText || "").trim();

    const textPreview = selectedText.length > 0
      ? (selectedText.length > 6
        ? `'${selectedText.slice(0, 6)}...'`
        : `'${selectedText}'`)
      : "NO_TEXT";

    const selectionRef = textPreview !== "NO_TEXT"
      ? `[${noteName} - ${textPreview}(${selection.startOffset}:${selection.endOffset})]`
      : `[${noteName} - ${selection.startOffset}:${selection.endOffset}]`;

    const escapedSelectionRef = selectionRef.replace(/"/g, "&quot;");

    return {
      html:
        `<a class="mention selection-ref" data-mention="true" data-id="selection-${selection.startOffset}-${selection.endOffset}" data-type="selection" data-label="${escapedSelectionRef}" contenteditable="false">${selectionRef}</a> `,
      text: selectionRef,
      id: `${selection.startOffset}-${selection.endOffset}-${selection.timestamp}`,
    };
  }, [noteData?.title, humanData?.full_name, organizationData?.name]);

  return {
    // State
    isModelModalOpen,
    setIsModelModalOpen,

    // Data
    entityTitle,
    currentModelName,
    pendingSelection,

    // Handlers
    handleMentionSearch,
    processSelection,
    clearPendingSelection,

    // Submit wrapper
    handleSubmit: (mentionedContent?: any[], selectionData?: any, htmlContent?: string) => {
      onSubmit(mentionedContent, selectionData, htmlContent);
      clearPendingSelection();
    },
  };
}
