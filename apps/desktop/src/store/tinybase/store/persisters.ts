import { listen, TauriEvent, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect } from "react";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

import { useCalendarPersister } from "../persister/calendar";
import { useChatPersister } from "../persister/chat";
import { useEventsPersister } from "../persister/events";
import { useFolderPersister } from "../persister/folder";
import { useHumanPersister } from "../persister/human";
import { useLocalPersister } from "../persister/local";
import { useNotePersister } from "../persister/note";
import { useOrganizationPersister } from "../persister/organization";
import { usePromptPersister } from "../persister/prompts";
import { useSessionPersister } from "../persister/session";
import { useTemplatePersister } from "../persister/templates";
import { useTranscriptPersister } from "../persister/transcript";
import { type Store } from "./main";
import { registerSaveHandler } from "./save";

type Saveable = { save(): Promise<unknown> };

export function useMainPersisters(store: Store) {
  const localPersister = useLocalPersister(store);

  const folderPersister = useFolderPersister(store);

  const markdownPersister = useNotePersister(store);

  const transcriptPersister = useTranscriptPersister(store);

  const organizationPersister = useOrganizationPersister(store);

  const humanPersister = useHumanPersister(store);

  const eventPersister = useEventsPersister(store);

  const chatPersister = useChatPersister(store);

  const promptPersister = usePromptPersister(store);

  const templatePersister = useTemplatePersister(store);

  const sessionPersister = useSessionPersister(store);

  const calendarPersister = useCalendarPersister(store);

  usePersisterSaveEvents(localPersister);

  return {
    localPersister,
    folderPersister,
    markdownPersister,
    transcriptPersister,
    organizationPersister,
    humanPersister,
    eventPersister,
    chatPersister,
    promptPersister,
    templatePersister,
    sessionPersister,
    calendarPersister,
  };
}

function usePersisterSaveEvents(persister: Saveable | null) {
  useEffect(() => {
    if (!persister) {
      return;
    }

    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    let unlistenClose: UnlistenFn | undefined;
    let unlistenBlur: UnlistenFn | undefined;
    let saving = false;

    const save = async () => {
      if (saving) {
        return;
      }
      saving = true;
      try {
        await persister.save();
      } catch (error) {
        console.error(error);
      } finally {
        saving = false;
      }
    };

    const register = async () => {
      unlistenClose = await listen(TauriEvent.WINDOW_CLOSE_REQUESTED, save, {
        target: { kind: "WebviewWindow", label: "main" },
      });

      unlistenBlur = await listen(TauriEvent.WINDOW_BLUR, save, {
        target: { kind: "WebviewWindow", label: "main" },
      });
    };

    void register();

    return () => {
      unlistenBlur?.();
      unlistenClose?.();
    };
  }, [persister]);

  useEffect(() => {
    if (!persister) {
      return;
    }

    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    let saving = false;

    return registerSaveHandler(async () => {
      if (saving) {
        return;
      }
      saving = true;
      try {
        await persister.save();
      } finally {
        saving = false;
      }
    });
  }, [persister]);
}
