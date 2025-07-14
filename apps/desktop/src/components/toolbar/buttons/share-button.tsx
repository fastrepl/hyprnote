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
import { client, commands as obsidianCommands, patchVaultByFilename, putVaultByFilename } from "@hypr/plugin-obsidian";
import { html2md } from "@hypr/tiptap/shared";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { useSession } from "@hypr/utils/contexts";
import { exportToPDF } from "../utils/pdf-export";

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
        const filePath = baseFolder ? await join(baseFolder!, filename) : filename;
        const convertedMarkdown = session.enhanced_memo_html ? html2md(session.enhanced_memo_html) : "";

        await putVaultByFilename({
          client,
          path: { filename: filePath },
          body: convertedMarkdown,
          bodySerializer: null,
          headers: {
            "Content-Type": "text/markdown",
          },
        });

        const targets = [
          { target: "date", value: new Date().toISOString() },
        ];
        for (const { target, value } of targets) {
          await patchVaultByFilename({
            client,
            path: { filename: filePath },
            headers: {
              "Operation": "replace",
              "Target-Type": "frontmatter",
              "Target": target,
              "Create-Target-If-Missing": "true",
            },
            body: value,
          });
        }

        const url = await obsidianCommands.getDeepLinkUrl(filePath);
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
