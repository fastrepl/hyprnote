import { useCallback } from "react";

import * as main from "../store/tinybase/main";

/**
 * Hook to create a new enhanced note for a session
 * Returns the ID of the created note
 * Note: This only creates the row - starting the enhancement task
 * should be handled separately by the caller
 */
export function useCreateEnhancedNote() {
  const store = main.UI.useStore(main.STORE_ID) as main.Store | undefined;

  return useCallback(
    (sessionId: string, templateId?: string) => {
      if (!store) return null;

      const enhancedNoteId = crypto.randomUUID();
      const now = new Date().toISOString();
      const userId = store.getValue("user_id");

      // Get next position number by counting existing rows
      let existingCount = 0;
      store.forEachRow("enhanced_notes", (rowId, _forEachCell) => {
        const rowSessionId = store.getCell("enhanced_notes", rowId, "session_id");
        if (rowSessionId === sessionId) {
          existingCount++;
        }
      });
      const nextPosition = existingCount + 1;

      // Create the enhanced note row
      store.setRow("enhanced_notes", enhancedNoteId, {
        user_id: userId || "",
        created_at: now,
        session_id: sessionId,
        content: "",
        position: nextPosition,
        title: nextPosition === 1 ? "Summary" : `Summary ${nextPosition}`,
        template_id: templateId,
      });

      return enhancedNoteId;
    },
    [store],
  );
}

/**
 * Hook to delete an enhanced note
 */
export function useDeleteEnhancedNote() {
  const store = main.UI.useStore(main.STORE_ID);

  return useCallback(
    (enhancedNoteId: string) => {
      if (!store) return;

      // Delete the row
      store.delRow("enhanced_notes", enhancedNoteId);

      // Note: We don't renumber positions - they stay as-is
      // This prevents unnecessary updates to unrelated notes
    },
    [store],
  );
}

/**
 * Hook to rename an enhanced note
 */
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

/**
 * Hook to get all enhanced notes for a session
 */
export function useEnhancedNotes(sessionId: string) {
  return main.UI.useSliceRowIds(
    main.INDEXES.enhancedNotesBySession,
    sessionId,
    main.STORE_ID,
  );
}

/**
 * Hook to get a specific enhanced note's data
 */
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
