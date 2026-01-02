import { listen, TauriEvent, type UnlistenFn } from "@tauri-apps/api/event";
import { BaseDirectory, exists, mkdir } from "@tauri-apps/plugin-fs";
import { useEffect, useMemo } from "react";
import * as _UI from "tinybase/ui-react/with-schemas";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { type Schemas } from "@hypr/store";

import { DEFAULT_USER_ID } from "../../../utils";
import { createCalendarPersister } from "../persister/calendar";
import { createChatPersister } from "../persister/chat";
import { createEventPersister } from "../persister/events";
import { createHumanPersister } from "../persister/human";
import { createLocalPersister } from "../persister/local";
import { createNotePersister } from "../persister/note";
import { createOrganizationPersister } from "../persister/organization";
import { createPromptPersister } from "../persister/prompts";
import { createSessionPersister } from "../persister/session";
import { createTemplatePersister } from "../persister/templates";
import { createTranscriptPersister } from "../persister/transcript";
import { maybeImportFromJson } from "./importer";
import { type Store, STORE_ID } from "./main";
import { registerSaveHandler } from "./save";

type Saveable = { save(): Promise<unknown> };

const { useCreatePersister } = _UI as _UI.WithSchemas<Schemas>;

export function useMainPersisters(
  store: Store,
  persist: boolean,
  settingsStore: unknown,
) {
  const localPersister = useCreatePersister(
    store,
    async (store) => {
      const persister = createLocalPersister<Schemas>(store as Store, {
        storeTableName: STORE_ID,
        storeIdColumnName: "id",
      });

      await persister.load();

      if (!persist) {
        return undefined;
      }

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
    [persist],
  );

  const markdownPersister = useCreatePersister(
    store,
    async (store) => {
      if (!persist) {
        return undefined;
      }

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
    [persist, settingsStore],
  );

  const transcriptPersister = useCreatePersister(
    store,
    async (store) => {
      if (!persist) {
        return undefined;
      }

      return createTranscriptPersister<Schemas>(store as Store);
    },
    [persist],
  );

  const organizationPersister = useCreatePersister(
    store,
    async (store) => {
      if (!persist) {
        return undefined;
      }

      return createOrganizationPersister<Schemas>(store as Store);
    },
    [persist],
  );

  const humanPersister = useCreatePersister(
    store,
    async (store) => {
      if (!persist) {
        return undefined;
      }

      return createHumanPersister<Schemas>(store as Store);
    },
    [persist],
  );

  const eventPersister = useCreatePersister(
    store,
    async (store) => {
      if (!persist) {
        return undefined;
      }

      const persister = createEventPersister<Schemas>(store as Store, {
        mode: "load-only",
      });
      await persister.load();
      await persister.startAutoLoad();
      return persister;
    },
    [persist],
  );

  const chatPersister = useCreatePersister(
    store,
    async (store) => {
      if (!persist) {
        return undefined;
      }

      try {
        const dirExists = await exists("hyprnote/chats", {
          baseDir: BaseDirectory.Data,
        });
        if (!dirExists) {
          await mkdir("hyprnote/chats", {
            baseDir: BaseDirectory.Data,
            recursive: true,
          });
        }
      } catch (error) {
        console.error("Failed to create chats directory:", error);
        throw error;
      }

      return createChatPersister<Schemas>(store as Store);
    },
    [persist],
  );

  const promptPersister = useCreatePersister(
    store,
    async (store) => {
      if (!persist) {
        return undefined;
      }

      return createPromptPersister<Schemas>(store as Store);
    },
    [persist],
  );

  const templatePersister = useCreatePersister(
    store,
    async (store) => {
      if (!persist) {
        return undefined;
      }

      return createTemplatePersister<Schemas>(store as Store);
    },
    [persist],
  );

  const sessionPersister = useCreatePersister(
    store,
    async (store) => {
      if (!persist) {
        return undefined;
      }

      return createSessionPersister<Schemas>(store as Store);
    },
    [persist],
  );

  const calendarPersister = useCreatePersister(
    store,
    async (store) => {
      if (!persist) {
        return undefined;
      }

      return createCalendarPersister<Schemas>(store as Store);
    },
    [persist],
  );

  const persisters = useMemo(
    () =>
      localPersister &&
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
            eventPersister,
            chatPersister,
            promptPersister,
            templatePersister,
            sessionPersister,
            calendarPersister,
          ]
        : null,
    [
      localPersister,
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

  usePersisterSaveEvents(persisters, persist);

  return {
    localPersister,
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

function usePersisterSaveEvents(
  persisters: Saveable[] | null,
  persist: boolean,
) {
  useEffect(() => {
    if (!persist || !persisters) {
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
  }, [persisters, persist]);

  useEffect(() => {
    if (!persist || !persisters) {
      return;
    }

    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    return registerSaveHandler(async () => {
      await Promise.all(persisters.map((p) => p.save()));
    });
  }, [persisters, persist]);
}
