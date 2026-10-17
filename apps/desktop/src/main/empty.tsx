import { Trans } from "@lingui/react/macro";
import { platform } from "@tauri-apps/plugin-os";
import { useCallback, useState } from "react";

import { Kbd } from "@anlg/ui/components/ui/kbd";
import { toast } from "@anlg/ui/components/ui/toast";
import { cn } from "@anlg/utils";

import { FloatingChatCTA } from "~/shared/chat-cta";
import { StandardContentWrapper } from "~/shared/main";
import { useNewNote, useNewNoteAndListen } from "~/shared/useNewNote";
import { createSession } from "~/session/queries";
import { requestSessionImport } from "~/stt/session-import-intent";
import { type Tab, useTabs } from "~/store/zustand/tabs";

type ImportKind = "audio" | "transcript";

const INTERVIEW_TYPES = [
  "Initial Screen",
  "Technical Interview",
  "Behavioural Interview",
] as const;

export function TabContentEmpty({
  tab: _tab,
}: {
  tab: Extract<Tab, { type: "empty" }>;
}) {
  return (
    <StandardContentWrapper floatingButton={<FloatingChatCTA />}>
      <EmptyView />
    </StandardContentWrapper>
  );
}

function EmptyView() {
  const newNote = useNewNote({ behavior: "current" });
  const newNoteAndListen = useNewNoteAndListen({ behavior: "current" });
  const openCurrent = useTabs((state) => state.openCurrent);
  const primaryModifier = platform() === "macos" ? "⌘" : "Ctrl";

  const [isImporting, setIsImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importKind, setImportKind] = useState<ImportKind>("audio");
  const [conversationTitle, setConversationTitle] =
    useState("Audio interview");
  const [interviewType, setInterviewType] = useState("");
  const [interviewDate, setInterviewDate] = useState(getLocalDateInputValue());

  const openImportDialog = useCallback((kind: ImportKind) => {
    setImportKind(kind);
    setConversationTitle(
      kind === "audio" ? "Audio interview" : "Imported transcript",
    );
    setInterviewType("");
    setInterviewDate(getLocalDateInputValue());
    setImportDialogOpen(true);
  }, []);

  const startImport = useCallback(async () => {
    if (isImporting) return;

    setIsImporting(true);

    try {
      const title =
        conversationTitle.trim() ||
        (importKind === "audio" ? "Audio interview" : "Imported transcript");

      // Keep the import metadata in the existing event_json field.
      // The date is deliberately date-only; no start time is fabricated.
      const event_json = JSON.stringify({
        title,
        abrish_interview_type: interviewType || null,
        abrish_interview_date: interviewDate || null,
      });

      const sessionId = await createSession(title, undefined, {
        event_json,
      });

      // Register the import before opening the session so its screen can
      // consume the request even if it mounts immediately.
      requestSessionImport(sessionId, importKind);

      setImportDialogOpen(false);

      openCurrent({
        type: "sessions",
        id: sessionId,
        state: {
          view: null,
          autoStart: null,
          scheduledAutoStart: null,
        },
      });
    } catch (error) {
      console.error(
        `[home] failed to create ${importKind} session`,
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create a session.",
      );
    } finally {
      setIsImporting(false);
    }
  }, [
    conversationTitle,
    importKind,
    interviewDate,
    interviewType,
    isImporting,
    openCurrent,
  ]);

  const openSettings = useCallback(
    () => openCurrent({ type: "settings" }),
    [openCurrent],
  );

  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center px-5 py-10 sm:px-8 lg:px-12">
      <section className="overflow-hidden rounded-3xl border border-[#E9E2D8] bg-[#FFFEFB] shadow-[0_12px_40px_rgba(31,41,55,0.06)] dark:border-border dark:bg-card">
        <div className="flex flex-col gap-8 p-6 sm:p-9 lg:flex-row lg:items-end lg:justify-between lg:p-12">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#F7D8D6] bg-[#FFF1EF] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#B72E3A] dark:border-border dark:bg-muted dark:text-foreground">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-[#F04452]"
              />
              <Trans>Recruiter workspace</Trans>
            </div>

            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#172642] sm:text-4xl lg:text-5xl dark:text-foreground">
              <Trans>Make every interview count.</Trans>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-7 text-[#647084] sm:text-lg dark:text-muted-foreground">
              <Trans>
                Capture the conversation, keep the important evidence, and turn
                interview notes into clearer next steps.
              </Trans>
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <PrimaryAction
              label={<Trans>Start recording</Trans>}
              shortcut={[primaryModifier, "⇧", "N"]}
              onClick={newNoteAndListen}
            />

            <SecondaryAction
              label={<Trans>New interview notes</Trans>}
              shortcut={[primaryModifier, "N"]}
              onClick={newNote}
            />

            <SecondaryAction
              label={<Trans>Upload audio</Trans>}
              shortcut={[]}
              onClick={() => openImportDialog("audio")}
              disabled={isImporting}
            />

            <SecondaryAction
              label={<Trans>Import transcript</Trans>}
              shortcut={[]}
              onClick={() => openImportDialog("transcript")}
              disabled={isImporting}
            />
          </div>
        </div>

        <div className="grid border-t border-[#EEE8DF] bg-[#FAF7F1] sm:grid-cols-3 dark:border-border dark:bg-muted/30">
          <FeatureItem
            number="01"
            title={<Trans>Capture</Trans>}
            description={
              <Trans>Start with a recording or a new set of notes.</Trans>
            }
          />

          <FeatureItem
            number="02"
            title={<Trans>Understand</Trans>}
            description={
              <Trans>Review the transcript and AI-generated summary.</Trans>
            }
          />

          <FeatureItem
            number="03"
            title={<Trans>Follow through</Trans>}
            description={
              <Trans>Keep the details you need for the next decision.</Trans>
            }
          />
        </div>
      </section>

      <div className="mt-6 flex flex-col items-start justify-between gap-3 px-1 sm:flex-row sm:items-center">
        <p className="text-sm text-[#778195] dark:text-muted-foreground">
          <Trans>Your interview workspace, ready when you are.</Trans>
        </p>

        <button
          type="button"
          onClick={openSettings}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#536176] transition-colors hover:bg-[#F0EBE2] hover:text-[#172642] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04452] dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground"
        >
          <span aria-hidden="true" className="text-base">
            ⚙
          </span>
          <Trans>Workspace settings</Trans>
          <Kbd className="ml-1 hidden sm:inline-flex">{`${primaryModifier} ,`}</Kbd>
        </button>
      </div>

      {importDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !isImporting
            ) {
              setImportDialogOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="abrish-import-title"
            className="w-full max-w-xl rounded-2xl border border-border bg-background p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="abrish-import-title"
                  className="text-xl font-semibold text-foreground"
                >
                  Import an interview
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a source and add details to help organize the
                  interview.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close import dialog"
                disabled={isImporting}
                onClick={() => setImportDialogOpen(false)}
                className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div
              className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1"
              role="tablist"
              aria-label="Import source"
            >
              <button
                type="button"
                role="tab"
                aria-selected={importKind === "audio"}
                onClick={() => {
                  setImportKind("audio");

                  if (
                    !conversationTitle.trim() ||
                    conversationTitle === "Imported transcript"
                  ) {
                    setConversationTitle("Audio interview");
                  }
                }}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium",
                  importKind === "audio"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                Upload audio
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={importKind === "transcript"}
                onClick={() => {
                  setImportKind("transcript");

                  if (
                    !conversationTitle.trim() ||
                    conversationTitle === "Audio interview"
                  ) {
                    setConversationTitle("Imported transcript");
                  }
                }}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium",
                  importKind === "transcript"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                Import transcript
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="abrish-conversation-title"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Conversation name
                </label>

                <input
                  id="abrish-conversation-title"
                  value={conversationTitle}
                  onChange={(event) =>
                    setConversationTitle(event.target.value)
                  }
                  maxLength={200}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="e.g. Backend Engineer — Candidate"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="abrish-interview-type"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Interview type
                  </label>

                  <select
                    id="abrish-interview-type"
                    value={interviewType}
                    onChange={(event) =>
                      setInterviewType(event.target.value)
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select type (optional)</option>

                    {INTERVIEW_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="abrish-interview-date"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Interview date
                  </label>

                  <input
                    id="abrish-interview-date"
                    type="date"
                    value={interviewDate}
                    onChange={(event) =>
                      setInterviewDate(event.target.value)
                    }
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <p className="text-xs leading-5 text-muted-foreground">
                The date is editable. Candidate details and an interview start
                time are not required.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => setImportDialogOpen(false)}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isImporting}
                onClick={() => void startImport()}
                className="rounded-lg bg-[#F04452] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D93645] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isImporting
                  ? "Preparing…"
                  : importKind === "audio"
                    ? "Continue to audio upload"
                    : "Continue to transcript import"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function getLocalDateInputValue(): string {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function FeatureItem({
  number,
  title,
  description,
}: {
  number: string;
  title: React.ReactNode;
  description: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 px-6 py-5 sm:px-7 sm:py-6">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold tracking-wide text-[#D9414D] shadow-sm ring-1 ring-[#F0DAD5] dark:bg-background dark:ring-border">
        {number}
      </span>

      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-[#172642] dark:text-foreground">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-5 text-[#697589] dark:text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function PrimaryAction({
  label,
  shortcut,
  onClick,
}: {
  label: React.ReactNode;
  shortcut: string[];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tauri-drag-region="false"
      className={cn([
        "group inline-flex min-h-12 items-center justify-center gap-4 rounded-xl bg-[#F04452] px-5 py-3",
        "text-sm font-semibold text-white shadow-[0_5px_14px_rgba(240,68,82,0.20)] transition-all",
        "hover:-translate-y-0.5 hover:bg-[#D93645] hover:shadow-[0_8px_20px_rgba(240,68,82,0.24)]",
        "active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04452] focus-visible:ring-offset-2",
      ])}
    >
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-lg bg-white/15 text-lg"
      >
        ◉
      </span>

      <span>{label}</span>

      <Kbd className="border-white/20 bg-white/10 text-white group-hover:bg-white/15">
        {shortcut.join(" ")}
      </Kbd>
    </button>
  );
}

function SecondaryAction({
  label,
  shortcut,
  onClick,
  disabled = false,
}: {
  label: React.ReactNode;
  shortcut: string[];
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-tauri-drag-region="false"
      className={cn([
        "inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[#E5DED3] bg-white px-4 py-3",
        "text-sm font-semibold text-[#24334D] transition-all hover:border-[#D7C9B8] hover:bg-[#FAF7F1]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04452] focus-visible:ring-offset-2",
        "dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-accent",
      ])}
    >
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-lg bg-[#F4EEE5] text-lg text-[#536176] dark:bg-muted dark:text-foreground"
      >
        +
      </span>

      <span>{label}</span>

      {shortcut.length > 0 ? (
        <Kbd className="hidden sm:inline-flex">{shortcut.join(" ")}</Kbd>
      ) : null}
    </button>
  );
}
