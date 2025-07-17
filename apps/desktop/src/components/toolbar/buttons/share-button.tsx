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
import { Session } from "@hypr/plugin-db";
import { client, commands as obsidianCommands, patchVaultByFilename, putVaultByFilename, getVault } from "@hypr/plugin-obsidian";
import { html2md } from "@hypr/tiptap/shared";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { useSession } from "@hypr/utils/contexts";
import { exportToPDF } from "../utils/pdf-export";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";


export function ShareButton() {
  const param = useParams({ from: "/app/note/$id", shouldThrow: false });
  return param ? <ShareButtonInNote /> : null;
}

interface ExportCard {
  id: "pdf" | "email" | "obsidian";
  title: string;
  icon: React.ReactNode;
  description: string;
  docsUrl: string;
}

function ShareButtonInNote() {
  const { userId } = useHypr();
  const param = useParams({ from: "/app/note/$id", shouldThrow: true });
  const session = useSession(param.id, (s) => s.session);

  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedObsidianFolder, setSelectedObsidianFolder] = useState<string>("default");
  const hasEnhancedNote = !!session?.enhanced_memo_html;

  // Function to determine default folder selection
  const getDefaultSelectedFolder = (folders: Array<{value: string, label: string}>, sessionTags: any[]) => {
    console.log("session tags for default folder selection:", sessionTags);
    
    if (!sessionTags || sessionTags.length === 0) {
      console.log("No tags found, returning default");
      return "default";
    }

    // Get tag names
    const tagNames = sessionTags.map((tag: any) => tag.name.toLowerCase());
    console.log("tagnames for setting default folder:", tagNames);

    console.log("folders for default folder selection:", folders);
    
    // First, look for exact matches
    for (const tagName of tagNames) {
      const exactMatch = folders.find(folder => 
        folder.value.toLowerCase() === tagName
      );
      if (exactMatch) {
        console.log("Found exact match:", exactMatch.value);
        return exactMatch.value;
      }
    }
    
    // Second, look for folders that include any tag in their name
    for (const tagName of tagNames) {
      const partialMatch = folders.find(folder => 
        folder.value.toLowerCase().includes(tagName)
      );
      if (partialMatch) {
        console.log("Found partial match:", partialMatch.value);
        return partialMatch.value;
      }
    }
    
    // If no matches found, return default
    console.log("No folder matches found, returning default");
    return "default";
  };

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

  // Fetch actual Obsidian folders
  const obsidianFolders = useQuery({
    queryKey: ["obsidian", "folders"],
    queryFn: async () => {
      if (!isObsidianConfigured.data) return [];
      
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
        
        console.log("=== OBSIDIAN API DEBUG ===");
        console.log("Full response:", response);
        console.log("Files array:", response.data?.files);
        
        // Filter for directories only (items ending with "/") and remove trailing slash
        const folders = response.data?.files
          ?.filter(item => item.endsWith("/"))
          ?.map(folder => ({
            value: folder.slice(0, -1), // Remove trailing slash
            label: folder.slice(0, -1)  // Remove trailing slash
          })) || [];

        // Add default option at the beginning
        return [
          { value: "default", label: "Default (Root)" },
          ...folders
        ];
      } catch (error) {
        console.error("Failed to fetch Obsidian folders:", error);
        return [{ value: "default", label: "Default (Root)" }];
      }
    },
    enabled: false, // Disable automatic fetching
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
    
    // Fetch folders when Obsidian option is expanded
    if (id === "obsidian" && expandedId !== id && isObsidianConfigured.data) {
      // Fetch both folders and tags in parallel, just like in exportMutation
      Promise.all([
        obsidianFolders.refetch(),
        dbCommands.listSessionTags(param.id)
      ]).then(([foldersResult, sessionTags]) => {
        // Set default folder after both fetches complete
        if (obsidianFolders.data && obsidianFolders.data.length > 0) {
          console.log("setting default folder");
          console.log("fetched sessionTags:", sessionTags);
          const defaultFolder = getDefaultSelectedFolder(obsidianFolders.data, sessionTags);
          setSelectedObsidianFolder(defaultFolder);
        }
      }).catch((error) => {
        console.error("Error fetching folders or tags:", error);
        // Fallback to default if anything fails
        setSelectedObsidianFolder("default");
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    setExpandedId(null);

    if (newOpen) {
      analyticsCommands.event({
        event: "share_option_expanded",
        distinct_id: userId,
      });
    }
  };

  const exportMutation = useMutation({
    mutationFn: async ({ session, optionId }: { session: Session; optionId: string }) => {
      const start = performance.now();
      let result: {
        type: "pdf";
        path: string;
      } | {
        type: "email";
        url: string;
      } | {
        type: "obsidian";
        url: string;
      } | null = null;

      if (optionId === "pdf") {
        const path = await exportToPDF(session);
        result = { type: "pdf", path };
      } else if (optionId === "email") {
        result = { type: "email", url: `mailto:?subject=${encodeURIComponent(session.title)}` };
      } else if (optionId === "obsidian") {
        const [baseFolder, apiKey, baseUrl, sessionTags, sessionParticipants] = await Promise.all([
          obsidianCommands.getBaseFolder(),
          obsidianCommands.getApiKey(),
          obsidianCommands.getBaseUrl(),
          dbCommands.listSessionTags(param.id),  // Get tags for this session
          dbCommands.sessionListParticipants(param.id),  // Get participants for this session
        ]);

        client.setConfig({
          fetch: tauriFetch,
          auth: apiKey!,
          baseUrl: baseUrl!,
        });

        const filename = `${session.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-")}.md`;
        
        // Use selected folder or base folder
        let finalPath: string;
        if (selectedObsidianFolder === "default") {
          // Only use baseFolder when user selects "default"
          finalPath = baseFolder ? await join(baseFolder!, filename) : filename;
        } else {
          // When user selects a specific folder, use it directly from vault root
          finalPath = await join(selectedObsidianFolder, filename);
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

        const targets = [
          { target: "date", value: new Date().toISOString() },
          // Only include tags if there are any
          ...(sessionTags.length > 0 ? [{ 
            target: "tags", 
            value: sessionTags.map(tag => tag.name) 
          }] : []),
          // Only include attendees if there are any with names
          ...(sessionParticipants.filter(participant => participant.full_name).length > 0 ? [{ 
            target: "attendees", 
            value: sessionParticipants.map(participant => participant.full_name).filter(Boolean)
          }] : []),
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
            body: Array.isArray(value) ? value : value, // Remove JSON.stringify for arrays
          });
        }

        const url = await obsidianCommands.getDeepLinkUrl(finalPath);
        result = { type: "obsidian", url };
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
      if (result?.type === "pdf") {
        openPath(result.path);
      } else if (result?.type === "email") {
        openUrl(result.url);
      } else if (result?.type === "obsidian") {
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
                    {
                      <button className="text-gray-500">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    }
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
