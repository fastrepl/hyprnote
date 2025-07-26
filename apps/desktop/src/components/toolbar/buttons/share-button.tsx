import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { join } from "@tauri-apps/api/path";
import { message } from "@tauri-apps/plugin-dialog";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { BookText, ChevronDown, ChevronUp, FileText, HelpCircle, Mail, Share2Icon } from "lucide-react";
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
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { useSession } from "@hypr/utils/contexts";
import { exportToPDF } from "../utils/pdf-export";

export function ShareButton() {
  const param = useParams({ from: "/app/note/$id", shouldThrow: false });
  return param ? <ShareButtonInNote /> : null;
}

function ShareButtonInNote() {
  const { userId } = useHypr();
  const param = useParams({ from: "/app/note/$id", shouldThrow: true });
  const session = useSession(param.id, (s) => s.session);

  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedObsidianFolder, setSelectedObsidianFolder] = useState<string>("default");
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

  const exportOptions: ExportCard[] = [
    {
      id: "pdf",
      title: "PDF",
      icon: <FileText size={20} />,
      description: "Save as PDF document",
      docsUrl: "https://docs.hyprnote.com/sharing#pdf",
    },
    {
      id: "email",
      title: "Email",
      icon: <Mail size={20} />,
      description: "Share via email",
      docsUrl: "https://docs.hyprnote.com/sharing#email",
    },
    isObsidianConfigured.data
      ? {
        id: "obsidian",
        title: "Obsidian",
        icon: <BookText size={20} />,
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

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    setExpandedId(null);

    if (newOpen) {
      isObsidianConfigured.refetch().then((configResult) => {
        if (configResult.data) {
          obsidianFolders.refetch();
        }
      });

      analyticsCommands.event({
        event: "share_option_expanded",
        distinct_id: userId,
      });
    }
  };

  const exportMutation = useMutation({
    mutationFn: async ({ session, optionId }: { session: Session; optionId: string }) => {
      const start = performance.now();
      let result: ExportResult | null = null;

      if (optionId === "pdf") {
        result = await exportHandlers.pdf(session);
      } else if (optionId === "email") {
        result = await exportHandlers.email(session);
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
      if (result?.type === "pdf" && result.path) {
        openPath(result.path);
      } else if (result?.type === "email" && result.url) {
        openUrl(result.url);
      } else if (result?.type === "obsidian" && result.url) {
        openUrl(result.url);
      }
    },
    onSettled: () => {
      setOpen(false);
    },
    onError: (error) => {
      console.error(error);
      message(JSON.stringify(error), { title: "Error", kind: "error" });
    },
  });

  const handleExport = (optionId: string) => {
    exportMutation.mutate({ session, optionId });
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          disabled={!hasEnhancedNote}
          variant="ghost"
          size="icon"
          className="hover:bg-neutral-200"
          aria-label="Share"
        >
          <Share2Icon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3 focus:outline-none focus:ring-0 focus:ring-offset-0"
        align="end"
      >
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Share Enhanced Note</h3>
            <p className="text-xs text-gray-500">
              <button
                onClick={() => openUrl("https://hyprnote.canny.io")}
                className="text-gray-400 hover:text-gray-600 transition-colors underline"
              >
                Let us know if you want other ways to share!
              </button>
            </p>
          </div>
          <div className="space-y-2">
            {exportOptions.map((option) => {
              const expanded = expandedId === option.id;

              return (
                <div key={option.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpanded(option.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-gray-700">{option.icon}</div>
                      <span className="font-medium text-sm">{option.title}</span>
                    </div>
                    <button className="text-gray-500">
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                  {expanded && (
                    <div className="px-3 pb-3 pt-2 border-t bg-gray-50">
                      <div className="flex items-center gap-1 mb-3">
                        <p className="text-xs text-gray-600">{option.description}</p>
                        <button
                          onClick={() => openUrl(option.docsUrl)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="Learn more"
                        >
                          <HelpCircle size={12} />
                        </button>
                      </div>

                      {option.id === "obsidian" && (
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
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
                      )}

                      <button
                        onClick={() => handleExport(option.id)}
                        disabled={exportMutation.isPending}
                        className="w-full py-1.5 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors text-xs font-medium disabled:opacity-50"
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
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ExportCard {
  id: "pdf" | "email" | "obsidian";
  title: string;
  icon: React.ReactNode;
  description: string;
  docsUrl: string;
}

interface ExportResult {
  type: "pdf" | "email" | "obsidian";
  path?: string;
  url?: string;
}

interface ObsidianFolder {
  value: string;
  label: string;
}

const exportHandlers = {
  pdf: async (session: Session): Promise<ExportResult> => {
    const path = await exportToPDF(session);
    return { type: "pdf", path };
  },

  email: async (session: Session): Promise<ExportResult> => {
    const url = `mailto:?subject=${encodeURIComponent(session.title)}`;
    return { type: "email", url };
  },

  obsidian: async (
    session: Session,
    selectedFolder: string,
    sessionTags: Tag[] | undefined,
    sessionParticipants: Array<{ full_name: string | null }> | undefined,
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

    const convertedMarkdown = session.enhanced_memo_html ? html2md(session.enhanced_memo_html) : "";

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
      { target: "date", value: new Date().toISOString() },
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
