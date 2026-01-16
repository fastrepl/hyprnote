import { arch, version as osVersion, platform } from "@tauri-apps/plugin-os";
import { Bug, Lightbulb, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { commands as openerCommands } from "@hypr/plugin-opener2";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { env } from "../../env";

type FeedbackType = "bug" | "feature";

type FeedbackModalStore = {
  isOpen: boolean;
  type: FeedbackType | null;
  open: (type: FeedbackType) => void;
  close: () => void;
};

export const useFeedbackModal = create<FeedbackModalStore>((set) => ({
  isOpen: false,
  type: null,
  open: (type) => set({ isOpen: true, type }),
  close: () => set({ isOpen: false, type: null }),
}));

export function FeedbackModal() {
  const { isOpen, type, close } = useFeedbackModal();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!isOpen) {
      setTitle("");
      setDescription("");
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !description.trim() || !type) {
      return;
    }

    setIsSubmitting(true);

    try {
      const gitHash = await miscCommands.getGitHash();

      const deviceInfo = [
        `**Platform:** ${platform()}`,
        `**Architecture:** ${arch()}`,
        `**OS Version:** ${osVersion()}`,
        `**App Version:** ${env.VITE_APP_VERSION ?? "unknown"}`,
        `**Git Hash:** ${gitHash}`,
      ].join("\n");

      if (type === "bug") {
        const body = `## Description
${description}

## Device Information
${deviceInfo}

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
${description}

## Submitted From
${deviceInfo}

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
  }, [title, description, type, close]);

  if (!isOpen || !type) {
    return null;
  }

  const isBug = type === "bug";

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
        onClick={close}
      >
        <div
          data-tauri-drag-region
          className="w-full min-h-11"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn([
            "relative w-full max-w-lg max-h-full overflow-auto",
            "bg-background rounded-lg shadow-lg pointer-events-auto",
          ])}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={close}
            className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div
                className={cn([
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  isBug ? "bg-red-50" : "bg-amber-50",
                ])}
              >
                {isBug ? (
                  <Bug className="h-5 w-5 text-red-500" />
                ) : (
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {isBug ? "Report a Bug" : "Suggest a Feature"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isBug
                    ? "Help us fix issues by describing what went wrong"
                    : "Share your ideas to help improve Hyprnote"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="feedback-title"
                  className="block text-sm font-medium mb-1.5"
                >
                  Title
                </label>
                <input
                  id="feedback-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    isBug
                      ? "Brief description of the bug"
                      : "Brief description of the feature"
                  }
                  className={cn([
                    "w-full px-3 py-2 rounded-md",
                    "border border-neutral-200",
                    "text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                  ])}
                  maxLength={256}
                />
              </div>

              <div>
                <label
                  htmlFor="feedback-description"
                  className="block text-sm font-medium mb-1.5"
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
                    "w-full px-3 py-2 rounded-md",
                    "border border-neutral-200",
                    "text-sm resize-none",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                  ])}
                  maxLength={5000}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Device information (OS, app version) will be automatically
                included.
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={close} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !title.trim() || !description.trim()}
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
