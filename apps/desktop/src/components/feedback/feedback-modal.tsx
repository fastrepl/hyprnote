import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { arch, version as osVersion, platform } from "@tauri-apps/plugin-os";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";

import { commands as openerCommands } from "@hypr/plugin-opener2";
import { commands as tracingCommands } from "@hypr/plugin-tracing";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import { env } from "../../env";

type FeedbackModalStore = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const useFeedbackModal = create<FeedbackModalStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

export function FeedbackModal() {
  const { isOpen, close } = useFeedbackModal();
  const [description, setDescription] = useState("");
  const [attachLogs, setAttachLogs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

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
      setDescription("");
      setAttachLogs(true);
      setSubmitStatus("");
      setErrorMessage("");
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed.length < 10) {
      setErrorMessage("Description must be at least 10 characters");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    setSubmitStatus("Submitting...");

    try {
      let logs: string | undefined;
      if (attachLogs) {
        setSubmitStatus("Collecting logs...");
        const logsResult = await tracingCommands.logContent();
        if (logsResult.status === "ok" && logsResult.data) {
          logs = logsResult.data.slice(-10000);
        }
      }

      setSubmitStatus("Submitting...");

      const response = await tauriFetch(`${env.VITE_API_URL}/feedback/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: trimmed,
          logs,
          deviceInfo: {
            platform: platform(),
            arch: arch(),
            osVersion: osVersion(),
            appVersion: env.VITE_APP_VERSION ?? "unknown",
          },
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        issueUrl?: string;
        error?: string;
      };

      if (data.success && data.issueUrl) {
        await openerCommands.openUrl(data.issueUrl, null);
        close();
      } else {
        setErrorMessage(data.error ?? "Failed to submit feedback");
      }
    } catch (error) {
      console.error(
        "Failed to submit feedback:",
        error instanceof Error ? error.message : String(error),
      );
      setErrorMessage("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
      setSubmitStatus("");
    }
  }, [description, attachLogs, close]);

  if (!isOpen) {
    return null;
  }

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
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                  placeholder="Describe the bug or feature request..."
                  rows={6}
                  className={cn([
                    "w-full px-2.5 py-1.5 rounded-md",
                    "border",
                    errorMessage ? "border-red-500" : "border-neutral-200",
                    "text-sm resize-none",
                    "focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-1",
                  ])}
                  maxLength={5000}
                />
                {errorMessage && (
                  <p className="text-xs text-red-500 mt-1">{errorMessage}</p>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachLogs}
                  onChange={(e) => setAttachLogs(e.target.checked)}
                  className="rounded border-neutral-300"
                />
                <span className="text-sm text-neutral-600">
                  Attach app logs to help diagnose the issue
                </span>
              </label>
            </div>

            <div className="flex justify-start mt-4">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !description.trim()}
                className="h-8 text-sm"
              >
                {isSubmitting ? submitStatus || "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
