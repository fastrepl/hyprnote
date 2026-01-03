import { listen, TauriEvent, type UnlistenFn } from "@tauri-apps/api/event";
import { BaseDirectory, exists, mkdir } from "@tauri-apps/plugin-fs";
import { useEffect, useMemo } from "react";
import * as _UI from "tinybase/ui-react/with-schemas";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { type Schemas } from "@hypr/store";

import { DEFAULT_USER_ID } from "../../../utils";
import { useCalendarPersister } from "../persister/calendar";
import { useChatPersister } from "../persister/chat";
import { useEventsPersister } from "../persister/events";
import {
  createFolderPersister,
  initFolderOps,
  startFolderWatcher,
} from "../persister/folder";
import { useHumanPersister } from "../persister/human";
import { createLocalPersister } from "../persister/local";
import { createNotePersister } from "../persister/note";
import { useOrganizationPersister } from "../persister/organization";
import { usePromptPersister } from "../persister/prompts";
import { createSessionPersister } from "../persister/session";
import { useTemplatePersister } from "../persister/templates";
import { createTranscriptPersister } from "../persister/transcript";
import { maybeImportFromJson } from "./importer";
import { type Store, STORE_ID } from "./main";
import { registerSaveHandler } from "./save";

type Saveable = { save(): Promise<unknown> };

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useMainPersisters(store: Store, settingsStore: unknown) {
  const localPersister = useCreatePersister(
    store,
    async (store) => {
      const persister = createLocalPersister<Schemas>(store as Store, {
        storeTableName: STORE_ID,
        storeIdColumnName: "id",
      });

      await persister.load();

      const importResult = await maybeImportFromJson(
        store as Store,
        async () => {
          await persister.save();
        },
      );
      if (importResult.status === "error") {
        console.error("[Store] Import failed:", importResult.error);
      }

      const initializer = async (cb: () => void) => {
        store.transaction(() => cb());
        await persister.save();
      };

      void initializer(() => {
        if (!store.hasValue("user_id")) {
          store.setValue("user_id", DEFAULT_USER_ID);
        }

        const userId = store.getValue("user_id") as string;
        if (!store.hasRow("humans", userId)) {
          store.setRow("humans", userId, {
            user_id: userId,
            created_at: new Date().toISOString(),
          });
        }

        if (
          !store.getTableIds().includes("sessions") ||
          store.getRowIds("sessions").length === 0
        ) {
          const sessionId = crypto.randomUUID();
          const now = new Date().toISOString();

          store.setRow("sessions", sessionId, {
            user_id: DEFAULT_USER_ID,
            created_at: now,
            title: "Welcome to Hyprnote",
            raw_md: "",
            enhanced_md: "",
          });
        }
      });

      await persister.startAutoLoad();
      return persister;
    },
    [],
  );

  const folderPersister = useCreatePersister(
    store,
    async (store) => {
      const persister = createFolderPersister<Schemas>(store as Store);
      await persister.load();
      await persister.startAutoLoad();

      initFolderOps({
        store: store as Store,
        reloadFolders: async () => {
          await persister.load();
        },
      });

      if (getCurrentWebviewWindowLabel() === "main") {
        void startFolderWatcher(persister);
      }

      return persister;
    },
    [],
  );

  const markdownPersister = useCreatePersister(
    store,
    async (store) => {
      try {
        const dirExists = await exists("hyprnote/sessions", {
          baseDir: BaseDirectory.Data,
        });
        if (!dirExists) {
          await mkdir("hyprnote/sessions", {
            baseDir: BaseDirectory.Data,
            recursive: true,
          });
        }
      } catch (error) {
        console.error("Failed to create sessions directory:", error);
        throw error;
      }

      const persister = createNotePersister<Schemas>(
        store as Store,
        (sessionId: string, content: string) =>
          store.setPartialRow("sessions", sessionId, {
            enhanced_md: content,
          }),
      );

      return persister;
    },
    [settingsStore],
  );

  const transcriptPersister = useCreatePersister(
    store,
    async (store) => {
      return createTranscriptPersister<Schemas>(store as Store);
    },
    [],
  );

  const organizationPersister = useOrganizationPersister(store as Store);

  const humanPersister = useHumanPersister(store as Store);

  const eventPersister = useEventsPersister(store as Store);

  const chatPersister = useChatPersister(store as Store);

  const promptPersister = usePromptPersister(store as Store);

  const templatePersister = useTemplatePersister(store as Store);

  const sessionPersister = useCreatePersister(
    store,
    async (store) => {
      return createSessionPersister<Schemas>(store as Store);
    },
    [],
  );

  const calendarPersister = useCalendarPersister(store as Store);

  const saveablePersistors = useMemo(
    () =>
      localPersister &&
      folderPersister &&
      markdownPersister &&
      transcriptPersister &&
      organizationPersister &&
      humanPersister &&
      eventPersister &&
      chatPersister &&
      promptPersister &&
      templatePersister &&
      sessionPersister &&
      calendarPersister
        ? [
            localPersister,
            markdownPersister,
            transcriptPersister,
            organizationPersister,
            humanPersister,
            chatPersister,
            promptPersister,
            templatePersister,
            sessionPersister,
            calendarPersister,
          ]
        : null,
    [
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
    ],
  );

  usePersisterSaveEvents(saveablePersistors);

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

function usePersisterSaveEvents(persisters: Saveable[] | null) {
  useEffect(() => {
    if (!persisters) {
      return;
    }

    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    let unlistenClose: UnlistenFn | undefined;
    let unlistenBlur: UnlistenFn | undefined;

    const saveAll = async () => {
      try {
        await Promise.all(persisters.map((p) => p.save()));
      } catch (error) {
        console.error(error);
      }
    };

    const register = async () => {
      unlistenClose = await listen(TauriEvent.WINDOW_CLOSE_REQUESTED, saveAll, {
        target: { kind: "WebviewWindow", label: "main" },
      });

      unlistenBlur = await listen(TauriEvent.WINDOW_BLUR, saveAll, {
        target: { kind: "WebviewWindow", label: "main" },
      });
    };

    void register();

    return () => {
      unlistenBlur?.();
      unlistenClose?.();
    };
  }, [persisters]);

  useEffect(() => {
    if (!persisters) {
      return;
    }

    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    return registerSaveHandler(async () => {
      await Promise.all(persisters.map((p) => p.save()));
    });
  }, [persisters]);
}
