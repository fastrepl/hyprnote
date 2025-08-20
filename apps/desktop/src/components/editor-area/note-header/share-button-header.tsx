import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { join } from "@tauri-apps/api/path";
import { message } from "@tauri-apps/plugin-dialog";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { BookText, Check, ChevronDown, ChevronUp, Copy, FileText, HelpCircle, Mail } from "lucide-react";
import { useState } from "react";

import { useHypr } from "@/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { Session, Tag } from "@hypr/plugin-db";
import { commands as dbCommands } from "@hypr/plugin-db";
import {
  client,
  commands as obsidianCommands,
  getVault,
  patchVaultByFilename,
  putVaultByFilename,
} from "@hypr/plugin-obsidian";
import { html2md } from "@hypr/tiptap/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { useSession } from "@hypr/utils/contexts";
import { exportToPDF, getAvailableThemes, type ThemeName } from "../../toolbar/utils/pdf-export";

interface DirectAction {
  id: "copy";
  title: string;
  icon: React.ReactNode;
  description: string;
}

interface ExportCard {
  id: "pdf" | "email" | "obsidian";
  title: string;
  icon: React.ReactNode;
  description: string;
  docsUrl: string;
}

interface ExportResult {
  type: "copy" | "pdf" | "email" | "obsidian";
  path?: string;
  url?: string;
  success?: boolean;
}

interface ObsidianFolder {
  value: string;
  label: string;
}

const exportHandlers = {
  copy: async (session: Session): Promise<ExportResult> => {
    try {
      let textToCopy = "";

      if (session.enhanced_memo_html) {
        textToCopy = html2md(session.enhanced_memo_html);
      } else if (session.raw_memo_html) {
        textToCopy = html2md(session.raw_memo_html);
      } else {
        textToCopy = session.title || "No content available";
      }

      await navigator.clipboard.writeText(textToCopy);
      return { type: "copy", success: true };
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      throw new Error("Failed to copy note to clipboard");
    }
  },

  pdf: async (session: Session, theme: ThemeName = "default"): Promise<ExportResult> => {
    const path = await exportToPDF(session, theme);
    if (path) {
      await message(`Meeting summary saved to your 'Downloads' folder ("${path}")`);
    }
    return { type: "pdf", path };
  },

  email: async (
    session: Session,
    sessionParticipants?: Array<{ full_name: string | null; email: string | null }>,
  ): Promise<ExportResult> => {
    let bodyContent = "Here is the meeting summary: \n\n";

    if (session.enhanced_memo_html) {
      bodyContent += html2md(session.enhanced_memo_html);
    } else if (session.raw_memo_html) {
      bodyContent += html2md(session.raw_memo_html);
    } else {
      bodyContent += "No content available";
    }

    if (sessionParticipants && sessionParticipants.length > 0) {
      const participantNames = sessionParticipants
        .filter(p => p.full_name)
        .map(p => p.full_name)
        .join(", ");

      if (participantNames) {
        bodyContent += `\n\nMeeting Participants: ${participantNames}`;
      }
    }

    bodyContent += "\n\nSent with Hyprnote (www.hyprnote.com)\n\n";

    const participantEmails = sessionParticipants
      ?.filter(participant => participant.email && participant.email.trim())
      ?.map(participant => participant.email!)
      ?.join(",") || "";

    const subject = encodeURIComponent(session.title);
    const body = encodeURIComponent(bodyContent);

    const to = participantEmails ? `&to=${encodeURIComponent(participantEmails)}` : "";

    const url = `mailto:?subject=${subject}&body=${body}${to}`;
    return { type: "email", url };
  },

  obsidian: async (
    session: Session,
    selectedFolder: string,
    sessionTags: Tag[] | undefined,
    sessionParticipants: Array<{ full_name: string | null }> | undefined,
    includeTranscript: boolean = false,
  ): Promise<ExportResult> => {
    const [baseFolder, apiKey, baseUrl] = await Promise.all([
      obsidianCommands.getBaseFolder(),
      obsidianCommands.getApiKey(),
      obsidianCommands.getBaseUrl(),
    ]);

    client.setConfig({
      fetch: tauriFetch,
      auth: apiKey!,
      baseUrl: baseUrl!,
    });

    const filename = `${session.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-")}.md`;

    let finalPath: string;
    if (selectedFolder === "default") {
      finalPath = baseFolder ? await join(baseFolder!, filename) : filename;
    } else {
      finalPath = await join(selectedFolder, filename);
    }

    let convertedMarkdown = session.enhanced_memo_html ? html2md(session.enhanced_memo_html) : "";

    // Add transcript if requested
    if (includeTranscript && session.words && session.words.length > 0) {
      const transcriptText = convertWordsToTranscript(session.words);
      if (transcriptText) {
        convertedMarkdown += "\n\n---\n\n## Full Transcript\n\n" + transcriptText;
      }
    }

    await putVaultByFilename({
      client,
      path: { filename: finalPath },
      body: convertedMarkdown,
      bodySerializer: null,
      headers: {
        "Content-Type": "text/markdown",
      },
    });

    // Update frontmatter
    const targets = [
      { target: "date", value: session?.created_at ?? new Date().toISOString() },
      ...(sessionTags && sessionTags.length > 0
        ? [{
          target: "tags",
          value: sessionTags.map(tag => tag.name),
        }]
        : []),
      ...(sessionParticipants && sessionParticipants.filter(participant => participant.full_name).length > 0
        ? [{
          target: "attendees",
          value: sessionParticipants.map(participant => participant.full_name).filter(Boolean),
        }]
        : []),
    ];

    for (const { target, value } of targets) {
      await patchVaultByFilename({
        client,
        path: { filename: finalPath },
        headers: {
          "Operation": "replace",
          "Target-Type": "frontmatter",
          "Target": target,
          "Create-Target-If-Missing": "true",
        },
        body: value as any,
      });
    }

    const url = await obsidianCommands.getDeepLinkUrl(finalPath);
    return { type: "obsidian", url };
  },
};

function getDefaultSelectedFolder(folders: ObsidianFolder[], sessionTags: Tag[]): string {
  if (!sessionTags || sessionTags.length === 0) {
    return "default";
  }

  const tagNames = sessionTags.map((tag: Tag) => tag.name.toLowerCase());

  for (const tagName of tagNames) {
    const exactMatch = folders.find(folder => folder.value.toLowerCase() === tagName);
    if (exactMatch) {
      return exactMatch.value;
    }
  }

  for (const tagName of tagNames) {
    const partialMatch = folders.find(folder => folder.value.toLowerCase().includes(tagName));
    if (partialMatch) {
      return partialMatch.value;
    }
  }

  return "default";
}

async function fetchObsidianFolders(): Promise<ObsidianFolder[]> {
  try {
    const [apiKey, baseUrl] = await Promise.all([
      obsidianCommands.getApiKey(),
      obsidianCommands.getBaseUrl(),
    ]);

    client.setConfig({
      fetch: tauriFetch,
      auth: apiKey!,
      baseUrl: baseUrl!,
    });

    const response = await getVault({ client });

    const folders = response.data?.files
      ?.filter(item => item.endsWith("/"))
      ?.map(folder => ({
        value: folder.slice(0, -1),
        label: folder.slice(0, -1),
      })) || [];

    return [
      { value: "default", label: "Default (Root)" },
      ...folders,
    ];
  } catch (error) {
    console.error("Failed to fetch Obsidian folders:", error);

    obsidianCommands.getDeepLinkUrl("").then((url) => {
      openUrl(url);
    }).catch((error) => {
      console.error("Failed to open Obsidian:", error);
    });

    return [{ value: "default", label: "Default (Root)" }];
  }
}

function convertWordsToTranscript(words: any[]): string {
  if (!words || words.length === 0) {
    return "";
  }

  const lines: string[] = [];
  let currentSpeaker: any = null;
  let currentText = "";

  for (const word of words) {
    const isSameSpeaker = (!currentSpeaker && !word.speaker)
      || (currentSpeaker?.type === "unassigned" && word.speaker?.type === "unassigned"
        && currentSpeaker.value?.index === word.speaker.value?.index)
      || (currentSpeaker?.type === "assigned" && word.speaker?.type === "assigned"
        && currentSpeaker.value?.id === word.speaker.value?.id);

    if (!isSameSpeaker) {
      if (currentText.trim()) {
        const speakerLabel = getSpeakerLabel(currentSpeaker);
        lines.push(`[${speakerLabel}]\n${currentText.trim()}`);
      }

      currentSpeaker = word.speaker;
      currentText = word.text;
    } else {
      currentText += " " + word.text;
    }
  }

  if (currentText.trim()) {
    const speakerLabel = getSpeakerLabel(currentSpeaker);
    lines.push(`[${speakerLabel}]\n${currentText.trim()}`);
  }

  return lines.join("\n\n");
}

function getSpeakerLabel(speaker: any): string {
  if (!speaker) {
    return "Speaker";
  }

  if (speaker.type === "assigned" && speaker.value?.label) {
    return speaker.value.label;
  }

  if (speaker.type === "unassigned" && typeof speaker.value?.index === "number") {
    if (speaker.value.index === 0) {
      return "You";
    }
    return `Speaker ${speaker.value.index}`;
  }

  return "Speaker";
}

// Custom hook for share functionality
export function useShareLogic() {
  const { userId } = useHypr();
  const param = useParams({ from: "/app/note/$id", shouldThrow: true });
  const session = useSession(param.id, (s) => s.session);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedObsidianFolder, setSelectedObsidianFolder] = useState<string>("default");
  const [selectedPdfTheme, setSelectedPdfTheme] = useState<ThemeName>("default");
  const [includeTranscript, setIncludeTranscript] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const hasEnhancedNote = !!session?.enhanced_memo_html;

  const isObsidianConfigured = useQuery({
    queryKey: ["integration", "obsidian", "enabled"],
    queryFn: async () => {
      const [enabled, apiKey, baseUrl] = await Promise.all([
        obsidianCommands.getEnabled(),
        obsidianCommands.getApiKey(),
        obsidianCommands.getBaseUrl(),
      ]);
      return enabled && apiKey && baseUrl;
    },
  });

  const obsidianFolders = useQuery({
    queryKey: ["obsidian", "folders"],
    queryFn: () => fetchObsidianFolders(),
    enabled: false,
  });

  const sessionTags = useQuery({
    queryKey: ["session", "tags", param.id],
    queryFn: () => dbCommands.listSessionTags(param.id),
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  const sessionParticipants = useQuery({
    queryKey: ["session", "participants", param.id],
    queryFn: () => dbCommands.sessionListParticipants(param.id),
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  const directActions: DirectAction[] = [
    {
      id: "copy",
      title: "Copy Note",
      icon: <Copy size={16} />,
      description: "",
    },
  ];

  const exportOptions: ExportCard[] = [
    {
      id: "pdf",
      title: "PDF",
      icon: <FileText size={16} />,
      description: "Save as PDF document",
      docsUrl: "https://docs.hyprnote.com/sharing#pdf",
    },
    {
      id: "email",
      title: "Email",
      icon: <Mail size={16} />,
      description: "Share via email",
      docsUrl: "https://docs.hyprnote.com/sharing#email",
    },
    isObsidianConfigured.data
      ? {
        id: "obsidian",
        title: "Obsidian",
        icon: <BookText size={16} />,
        description: "Export to Obsidian",
        docsUrl: "https://docs.hyprnote.com/sharing#obsidian",
      }
      : null,
  ].filter(Boolean) as ExportCard[];

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);

    if (id === "obsidian" && expandedId !== id && isObsidianConfigured.data) {
      Promise.all([
        obsidianFolders.refetch(),
        sessionTags.refetch(),
      ]).then(([foldersResult, tagsResult]) => {
        const freshFolders = foldersResult.data;
        const freshTags = tagsResult.data;

        if (freshFolders && freshFolders.length > 0) {
          const defaultFolder = getDefaultSelectedFolder(freshFolders, freshTags ?? []);
          setSelectedObsidianFolder(defaultFolder);
        }
      }).catch((error) => {
        console.error("Error fetching Obsidian data:", error);
        setSelectedObsidianFolder("default");
      });
    }
  };

  const exportMutation = useMutation({
    mutationFn: async ({ session, optionId }: { session: Session; optionId: string }) => {
      const start = performance.now();
      let result: ExportResult | null = null;

      if (optionId === "copy") {
        result = await exportHandlers.copy(session);
      } else if (optionId === "pdf") {
        result = await exportHandlers.pdf(session, selectedPdfTheme);
      } else if (optionId === "email") {
        try {
          // fetch participants directly, bypassing cache
          const freshParticipants = await dbCommands.sessionListParticipants(param.id);
          result = await exportHandlers.email(session, freshParticipants);
        } catch (participantError) {
          console.warn("Failed to fetch participants, sending email without them:", participantError);
          result = await exportHandlers.email(session, undefined);
        }
      } else if (optionId === "obsidian") {
        sessionTags.refetch();
        sessionParticipants.refetch();

        let sessionTagsData = sessionTags.data;
        let sessionParticipantsData = sessionParticipants.data;

        if (!sessionTagsData) {
          const tagsResult = await sessionTags.refetch();
          sessionTagsData = tagsResult.data;
        }

        if (!sessionParticipantsData) {
          const participantsResult = await sessionParticipants.refetch();
          sessionParticipantsData = participantsResult.data;
        }

        result = await exportHandlers.obsidian(
          session,
          selectedObsidianFolder,
          sessionTagsData,
          sessionParticipantsData,
          includeTranscript,
        );
      }

      const elapsed = performance.now() - start;
      if (elapsed < 800) {
        await new Promise((resolve) => setTimeout(resolve, 800 - elapsed));
      }

      return result;
    },
    onMutate: ({ optionId }) => {
      analyticsCommands.event({
        event: "share_triggered",
        distinct_id: userId,
        type: optionId,
      });
    },
    onSuccess: (result) => {
      if (result?.type === "copy" && result.success) {
        setCopySuccess(true);
        // Reset after 2 seconds
        setTimeout(() => setCopySuccess(false), 2000);
      } else if (result?.type === "pdf" && result.path) {
        openPath(result.path);
      } else if (result?.type === "email" && result.url) {
        openUrl(result.url);
      } else if (result?.type === "obsidian" && result.url) {
        openUrl(result.url);
      }
    },
    onError: (error) => {
      console.error(error);
      message(JSON.stringify(error), { title: "Error", kind: "error" });
    },
  });

  const handleExport = (optionId: string) => {
    exportMutation.mutate({ session, optionId });
  };

  const resetExpandedState = () => {
    setExpandedId(null);
    setCopySuccess(false);
  };

  const handleOpenStateChange = (isOpen: boolean) => {
    if (isOpen) {
      isObsidianConfigured.refetch().then((configResult) => {
        if (configResult.data) {
          obsidianFolders.refetch();
        }
      });

      analyticsCommands.event({
        event: "share_option_expanded",
        distinct_id: userId,
      });
    } else {
      resetExpandedState();
    }
  };

  return {
    session,
    hasEnhancedNote,
    expandedId,
    selectedObsidianFolder,
    setSelectedObsidianFolder,
    selectedPdfTheme,
    setSelectedPdfTheme,
    includeTranscript,
    setIncludeTranscript,
    copySuccess,
    isObsidianConfigured,
    obsidianFolders,
    directActions,
    exportOptions,
    exportMutation,
    toggleExpanded,
    handleExport,
    handleOpenStateChange,
    resetExpandedState,
  };
}

// Reusable Share Content Component
export function SharePopoverContent() {
  const {
    expandedId,
    selectedObsidianFolder,
    setSelectedObsidianFolder,
    selectedPdfTheme,
    setSelectedPdfTheme,
    includeTranscript,
    setIncludeTranscript,
    copySuccess,
    obsidianFolders,
    directActions,
    exportOptions,
    exportMutation,
    toggleExpanded,
    handleExport,
  } = useShareLogic();

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-medium text-neutral-700">Share Enhanced Note</div>
      <div className="flex flex-col gap-2">
        {/* Direct action buttons */}
        {directActions.map((action) => {
          const isLoading = exportMutation.isPending && exportMutation.variables?.optionId === action.id;
          const isSuccess = action.id === "copy" && copySuccess;

          return (
            <div key={action.id} className="border border-neutral-200 rounded-md overflow-hidden">
              <button
                onClick={() => handleExport(action.id)}
                disabled={exportMutation.isPending}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <div className={`text-neutral-600 transition-colors ${isSuccess ? "text-green-600" : ""}`}>
                    {isSuccess ? <Check size={16} /> : action.icon}
                  </div>
                  <span className="font-medium text-sm">{action.title}</span>
                </div>
                {isLoading && <span className="text-xs text-neutral-500">Copying...</span>}
                {isSuccess && <span className="text-xs text-green-600">Copied!</span>}
              </button>
            </div>
          );
        })}

        {/* Expandable export options */}
        {exportOptions.map((option) => {
          const expanded = expandedId === option.id;

          return (
            <div key={option.id} className="border border-neutral-200 rounded-md overflow-hidden">
              <button
                className="flex items-center justify-between w-full px-3 py-2 hover:bg-neutral-50 transition-colors"
                onClick={() => toggleExpanded(option.id)}
              >
                <div className="flex items-center gap-2">
                  <div className="text-neutral-600">{option.icon}</div>
                  <span className="font-medium text-sm">{option.title}</span>
                </div>
                <div className="text-neutral-500">
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>
              {expanded && (
                <div className="px-3 pb-2 pt-1 border-t border-neutral-200 bg-neutral-50/30">
                  <div className="flex items-center gap-1 mb-2">
                    <p className="text-xs text-neutral-500">{option.description}</p>
                    <button
                      onClick={() => openUrl(option.docsUrl)}
                      className="text-neutral-400 hover:text-neutral-600 transition-colors"
                      title="Learn more"
                    >
                      <HelpCircle size={12} />
                    </button>
                  </div>

                  {option.id === "pdf" && (
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Theme
                      </label>
                      <Select
                        value={selectedPdfTheme}
                        onValueChange={(value) => setSelectedPdfTheme(value as ThemeName)}
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48 overflow-y-auto">
                          {getAvailableThemes().map((theme: ThemeName) => (
                            <SelectItem key={theme} value={theme} className="text-xs">
                              {theme.charAt(0).toUpperCase() + theme.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {option.id === "obsidian" && (
                    <>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Target Folder
                        </label>
                        <Select value={selectedObsidianFolder} onValueChange={setSelectedObsidianFolder}>
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue placeholder="Select folder" />
                          </SelectTrigger>
                          <SelectContent>
                            {obsidianFolders.data?.map((folder) => (
                              <SelectItem key={folder.value} value={folder.value} className="text-xs">
                                {folder.label}
                              </SelectItem>
                            )) || (
                              <SelectItem value="default" className="text-xs">
                                Default (Root)
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="mb-2">
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={includeTranscript}
                            onChange={(e) => setIncludeTranscript(e.target.checked)}
                            className="rounded border-neutral-300 text-neutral-700 focus:ring-neutral-500 focus:ring-1"
                          />
                          <span className="text-neutral-600">Include transcript</span>
                        </label>
                      </div>
                    </>
                  )}

                  <button
                    onClick={() => handleExport(option.id)}
                    disabled={exportMutation.isPending}
                    className="w-full py-1.5 bg-neutral-800 text-white rounded-sm hover:bg-neutral-900 transition-colors text-xs font-medium disabled:opacity-50"
                  >
                    {exportMutation.isPending
                      ? "Pending..."
                      : option.id === "email"
                      ? "Send"
                      : "Export"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-xs text-neutral-400 text-center">
        <button
          onClick={() => openUrl("https://hyprnote.canny.io")}
          className="hover:text-neutral-600 transition-colors underline"
        >
          Request more sharing options
        </button>
      </div>
    </div>
  );
}
