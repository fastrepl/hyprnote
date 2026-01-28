import { downloadDir } from "@tauri-apps/api/path";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { arch, version as osVersion, platform } from "@tauri-apps/plugin-os";
import { Bug, Lightbulb, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as openerCommands } from "@hypr/plugin-opener2";
import { commands as tracingCommands } from "@hypr/plugin-tracing";
import { Button } from "@hypr/ui/components/ui/button";
import { Checkbox } from "@hypr/ui/components/ui/checkbox";
import { cn } from "@hypr/utils";

import { env } from "../../env";

type FeedbackType = "bug" | "feature";

type FeedbackModalStore = {
  isOpen: boolean;
  initialType: FeedbackType;
  open: (initialType?: FeedbackType) => void;
  close: () => void;
};

export const useFeedbackModal = create<FeedbackModalStore>((set) => ({
  isOpen: false,
  initialType: "bug",
  open: (initialType = "bug") => set({ isOpen: true, initialType }),
  close: () => set({ isOpen: false }),
}));

async function getLogContent(): Promise<string | null> {
  const result = await tracingCommands.logContent();
  if (result.status !== "ok") {
    return null;
  }
  return result.data ?? null;
}

export function FeedbackModal() {
  const { isOpen, initialType, close } = useFeedbackModal();
  const [type, setType] = useState<FeedbackType>(initialType);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gitHash, setGitHash] = useState<string>("");
  const [attachLogs, setAttachLogs] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      miscCommands.getGitHash().then((result) => {
        setGitHash(result.status === "ok" ? result.data : "unknown");
      });
    } else {
      setDescription("");
      setGitHash("");
      setAttachLogs(false);
    }
  }, [isOpen, initialType]);

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const gitHashResult = await miscCommands.getGitHash();
      const gitHash =
        gitHashResult.status === "ok" ? gitHashResult.data : "unknown";

      const deviceInfo = [
        `**Platform:** ${platform()}`,
        `**Architecture:** ${arch()}`,
        `**OS Version:** ${osVersion()}`,
        `**App Version:** ${env.VITE_APP_VERSION ?? "unknown"}`,
        `**Git Hash:** ${gitHash}`,
      ].join("\n");

      const trimmedDescription = description.trim();
      const firstLine = trimmedDescription.split("\n")[0].slice(0, 100).trim();
      const title =
        firstLine || (type === "bug" ? "Bug Report" : "Feature Request");

      let logSection = "";
      if (attachLogs) {
        const logContent = await getLogContent();
        if (logContent) {
          const defaultPath = await downloadDir();
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const defaultFileName = `hyprnote-logs-${timestamp}.txt`;

          const filePath = await save({
            title: "Save Application Logs",
            defaultPath: `${defaultPath}/${defaultFileName}`,
            filters: [{ name: "Text Files", extensions: ["txt", "log"] }],
          });

          if (filePath) {
            await writeTextFile(filePath, logContent);
            logSection = `

## Application Logs
Logs have been saved to a file. Please attach the saved log file to this issue.
`;
          }
        }
      }

      if (type === "bug") {
        const body = `## Description
${trimmedDescription}

## Device Information
${deviceInfo}
${logSection}
---
*This issue was submitted from the Hyprnote desktop app.*
`;

        const url = new URL("https://github.com/fastrepl/hyprnote/issues/new");
        url.searchParams.set("title", title);
        url.searchParams.set("body", body);
        url.searchParams.set("labels", "bug,user-reported");

        await openerCommands.openUrl(url.toString(), null);
      } else {
        const body = `## Feature Request
${trimmedDescription}

## Submitted From
${deviceInfo}
${logSection}
---
*This feature request was submitted from the Hyprnote desktop app.*
`;

        const url = new URL(
          "https://github.com/fastrepl/hyprnote/discussions/new",
        );
        url.searchParams.set("category", "ideas");
        url.searchParams.set("title", title);
        url.searchParams.set("body", body);

        await openerCommands.openUrl(url.toString(), null);
      }

      close();
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [description, type, close, attachLogs]);

  if (!isOpen) {
    return null;
  }

  const isBug = type === "bug";

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-9999 bg-black/50 backdrop-blur-xs"
        onClick={close}
      >
        <div
          data-tauri-drag-region
          className="w-full min-h-11"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn([
            "relative w-full max-w-lg max-h-full overflow-auto",
            "bg-background rounded-lg shadow-lg pointer-events-auto",
          ])}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={close}
            className="absolute right-3 top-3 z-10 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-4">
            <h2 className="text-base font-semibold mb-3">Send Feedback</h2>

            <div className="flex gap-1 p-1 bg-neutral-100 rounded-md mb-3">
              <button
                onClick={() => setType("bug")}
                className={cn([
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xs text-sm font-medium transition-colors",
                  isBug
                    ? ["bg-white shadow-xs text-black"]
                    : ["text-neutral-600 hover:text-black"],
                ])}
              >
                <Bug className="h-3.5 w-3.5" />
                Bug Report
              </button>
              <button
                onClick={() => setType("feature")}
                className={cn([
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xs text-sm font-medium transition-colors",
                  !isBug
                    ? ["bg-white shadow-xs text-black"]
                    : ["text-neutral-600 hover:text-black"],
                ])}
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Feature Request
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label
                  htmlFor="feedback-description"
                  className="block text-sm font-medium mb-1"
                >
                  Description
                </label>
                <textarea
                  id="feedback-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    isBug
                      ? "What happened? What did you expect to happen? Steps to reproduce..."
                      : "Describe the feature you'd like to see. How would it help you?"
                  }
                  rows={6}
                  className={cn([
                    "w-full px-2.5 py-1.5 rounded-md",
                    "border border-neutral-200",
                    "text-sm resize-none",
                    "focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-1",
                  ])}
                  maxLength={5000}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="attach-logs"
                  checked={attachLogs}
                  onCheckedChange={(checked) => setAttachLogs(checked === true)}
                />
                <label
                  htmlFor="attach-logs"
                  className="text-sm text-neutral-600 cursor-pointer"
                >
                  Save application logs to file (for manual attachment)
                </label>
              </div>

              {gitHash && (
                <div className="mt-4 text-[10px] text-neutral-100 font-mono">
                  {gitHash}
                </div>
              )}
            </div>

            <div className="flex justify-start mt-4">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !description.trim()}
                className="h-8 text-sm"
              >
                {isSubmitting
                  ? "Opening..."
                  : isBug
                    ? "Report Bug"
                    : "Suggest Feature"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
