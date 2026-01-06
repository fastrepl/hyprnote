import { listen, TauriEvent, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect } from "react";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

import { useCalendarPersister } from "../persister/calendar";
import { useChatPersister } from "../persister/chat";
import { useChatShortcutPersister } from "../persister/chat-shortcuts";
import { useEventsPersister } from "../persister/events";
import { useFolderPersister } from "../persister/folder";
import { useHumanPersister } from "../persister/human";
import { useLocalPersister } from "../persister/local";
import { useOrganizationPersister } from "../persister/organization";
import { usePromptPersister } from "../persister/prompts";
import { useSessionPersister } from "../persister/session";
import { useTemplatePersister } from "../persister/templates";
import { useValuesPersister } from "../persister/values";
import { type Store } from "./main";
import { registerSaveHandler } from "./save";

type Saveable = { save(): Promise<unknown> };

function createGuardedSave(
  saveFn: () => Promise<unknown>,
  onError?: (error: unknown) => void,
): () => Promise<void> {
  let saving = false;
  return async () => {
    if (saving) {
      return;
    }
    saving = true;
    try {
      await saveFn();
    } catch (error) {
      onError?.(error);
    } finally {
      saving = false;
    }
  };
}

export function useMainPersisters(store: Store) {
  const localPersister = useLocalPersister(store);

  const valuesPersister = useValuesPersister(store);

  const folderPersister = useFolderPersister(store);

  const sessionPersister = useSessionPersister(store);

  const organizationPersister = useOrganizationPersister(store);

  const humanPersister = useHumanPersister(store);

  const eventPersister = useEventsPersister(store);

  const chatPersister = useChatPersister(store);

  const chatShortcutPersister = useChatShortcutPersister(store);

  const promptPersister = usePromptPersister(store);

  const templatePersister = useTemplatePersister(store);

  const calendarPersister = useCalendarPersister(store);

  usePersisterSaveEvents(localPersister);

  return {
    localPersister,
    valuesPersister,
    folderPersister,
    sessionPersister,
    organizationPersister,
    humanPersister,
    eventPersister,
    chatPersister,
    chatShortcutPersister,
    promptPersister,
    templatePersister,
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

    const save = createGuardedSave(
      () => persister.save(),
      (error) => console.error(error),
    );

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

    return registerSaveHandler(createGuardedSave(() => persister.save()));
  }, [persister]);
}
