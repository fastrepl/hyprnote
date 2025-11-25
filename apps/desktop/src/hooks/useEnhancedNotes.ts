import { useCallback, useEffect } from "react";

import { useHasTranscript } from "../components/main/body/sessions/shared";
import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/main";

export function useCreateEnhancedNote() {
  const store = main.UI.useStore(main.STORE_ID) as main.Store | undefined;
  const indexes = main.UI.useIndexes(main.STORE_ID);

  return useCallback(
    (sessionId: string, templateId?: string) => {
      if (!store || !indexes) return null;

      const normalizedTemplateId = templateId ?? undefined;

      const existingNoteIds = indexes.getSliceRowIds(
        main.INDEXES.enhancedNotesBySession,
        sessionId,
      );

      const existingId = existingNoteIds.find((id) => {
        const existingTemplateId = store.getCell(
          "enhanced_notes",
          id,
          "template_id",
        ) as string | undefined;
        return existingTemplateId === normalizedTemplateId;
      });

      if (existingId) return existingId;

      const enhancedNoteId = crypto.randomUUID();
      const now = new Date().toISOString();
      const userId = store.getValue("user_id");
      const nextPosition = existingNoteIds.length + 1;

      let title = "Summary";
      if (normalizedTemplateId) {
        const templateTitle = store.getCell(
          "templates",
          normalizedTemplateId,
          "title",
        );
        if (typeof templateTitle === "string") {
          title = templateTitle;
        }
      }

      store.setRow("enhanced_notes", enhancedNoteId, {
        user_id: userId || "",
        created_at: now,
        session_id: sessionId,
        content: "",
        position: nextPosition,
        title,
        template_id: normalizedTemplateId,
      });

      return enhancedNoteId;
    },
    [store, indexes],
  );
}

export function useDeleteEnhancedNote() {
  const store = main.UI.useStore(main.STORE_ID);

  return useCallback(
    (enhancedNoteId: string) => {
      if (!store) return;

      store.delRow("enhanced_notes", enhancedNoteId);
    },
    [store],
  );
}

export function useRenameEnhancedNote() {
  const store = main.UI.useStore(main.STORE_ID);

  return useCallback(
    (enhancedNoteId: string, newTitle: string) => {
      if (!store) return;

      store.setPartialRow("enhanced_notes", enhancedNoteId, {
        title: newTitle,
      });
    },
    [store],
  );
}

export function useEnhancedNotes(sessionId: string) {
  return main.UI.useSliceRowIds(
    main.INDEXES.enhancedNotesBySession,
    sessionId,
    main.STORE_ID,
  );
}

export function useEnhancedNote(enhancedNoteId: string) {
  const title = main.UI.useCell(
    "enhanced_notes",
    enhancedNoteId,
    "title",
    main.STORE_ID,
  );
  const content = main.UI.useCell(
    "enhanced_notes",
    enhancedNoteId,
    "content",
    main.STORE_ID,
  );
  const position = main.UI.useCell(
    "enhanced_notes",
    enhancedNoteId,
    "position",
    main.STORE_ID,
  );
  const templateId = main.UI.useCell(
    "enhanced_notes",
    enhancedNoteId,
    "template_id",
    main.STORE_ID,
  );

  return { title, content, position, templateId };
}

export function useEnsureDefaultSummary(sessionId: string) {
  const sessionMode = useListener((state) => state.getSessionMode(sessionId));
  const hasTranscript = useHasTranscript(sessionId);
  const enhancedNoteIds = main.UI.useSliceRowIds(
    main.INDEXES.enhancedNotesBySession,
    sessionId,
    main.STORE_ID,
  );
  const createEnhancedNote = useCreateEnhancedNote();

  useEffect(() => {
    if (
      !hasTranscript ||
      sessionMode === "running_active" ||
      sessionMode === "running_batch" ||
      (enhancedNoteIds && enhancedNoteIds.length > 0)
    ) {
      return;
    }

    createEnhancedNote(sessionId);
  }, [
    hasTranscript,
    sessionMode,
    sessionId,
    enhancedNoteIds?.length,
    createEnhancedNote,
  ]);
}
