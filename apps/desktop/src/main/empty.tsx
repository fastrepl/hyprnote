import { Trans } from "@lingui/react/macro";
import { platform } from "@tauri-apps/plugin-os";
import { useCallback } from "react";

import { Kbd } from "@anlg/ui/components/ui/kbd";
import { cn } from "@anlg/utils";

import { FloatingChatCTA } from "~/shared/chat-cta";
import { StandardContentWrapper } from "~/shared/main";
import { useNewNote, useNewNoteAndListen } from "~/shared/useNewNote";
import { type Tab, useTabs } from "~/store/zustand/tabs";

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
              <span aria-hidden="true" className="size-2 rounded-full bg-[#F04452]" />
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
          </div>
        </div>

        <div className="grid border-t border-[#EEE8DF] bg-[#FAF7F1] sm:grid-cols-3 dark:border-border dark:bg-muted/30">
          <FeatureItem
            number="01"
            title={<Trans>Capture</Trans>}
            description={<Trans>Start with a recording or a new set of notes.</Trans>}
          />
          <FeatureItem
            number="02"
            title={<Trans>Understand</Trans>}
            description={<Trans>Review the transcript and AI-generated summary.</Trans>}
          />
          <FeatureItem
            number="03"
            title={<Trans>Follow through</Trans>}
            description={<Trans>Keep the details you need for the next decision.</Trans>}
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
          <span aria-hidden="true" className="text-base">⚙</span>
          <Trans>Workspace settings</Trans>
          <Kbd className="ml-1 hidden sm:inline-flex">{`${primaryModifier} ,`}</Kbd>
        </button>
      </div>
    </main>
  );
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
      <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-lg bg-white/15 text-lg">
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
        "inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[#E5DED3] bg-white px-4 py-3",
        "text-sm font-semibold text-[#24334D] transition-all hover:border-[#D7C9B8] hover:bg-[#FAF7F1]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F04452] focus-visible:ring-offset-2",
        "dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-accent",
      ])}
    >
      <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-lg bg-[#F4EEE5] text-lg text-[#536176] dark:bg-muted dark:text-foreground">
        +
      </span>
      <span>{label}</span>
      <Kbd className="hidden sm:inline-flex">{shortcut.join(" ")}</Kbd>
    </button>
  );
}
