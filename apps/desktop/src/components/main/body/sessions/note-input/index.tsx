import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import type { JSONContent, TiptapEditor } from "@hypr/tiptap/editor";
import { EMPTY_TIPTAP_DOC, isValidTiptapContent } from "@hypr/tiptap/shared";
import { cn } from "@hypr/utils";

import { useAutoEnhance } from "../../../../../hooks/useAutoEnhance";
import { useAutoTitle } from "../../../../../hooks/useAutoTitle";
import * as main from "../../../../../store/tinybase/main";
import { type Tab, useTabs } from "../../../../../store/zustand/tabs";
import { type EditorView } from "../../../../../store/zustand/tabs/schema";
import { useCurrentNoteTab } from "../shared";
import { Attachments } from "./attachments";
import {
  loadSessionAttachments,
  ManifestCorruptionError,
  type PersistedAttachment,
  removeSessionAttachment,
  saveSessionAttachment,
} from "./attachments/storage";
import { Enhanced } from "./enhanced";
import { Header, useEditorTabs } from "./header";
import { RawEditor } from "./raw";
import { Transcript } from "./transcript";

export type Attachment = {
  id: string;
  type: "image" | "screenshot" | "link";
  title: string;
  addedAt: string;
  url?: string;
  thumbnailUrl?: string;
  objectUrl?: string;
  fileUrl?: string;
  mimeType?: string;
  size?: number;
  isPersisted?: boolean;
};

type AttachmentInsertOptions = {
  position?: number;
};

type AttachmentInsertionPayload = {
  id: string;
  src: string;
  position?: number;
};

type AttachmentSrcUpdatePayload = {
  id: string;
  src: string;
};

export function NoteInput({
  tab,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
}) {
  const sessionId = tab.id;
  const [isEditing, setIsEditing] = useState(false);
  const updateSessionTabState = useTabs((state) => state.updateSessionTabState);
  const editorRef = useRef<{ editor: TiptapEditor | null } | null>(null);

  useAutoEnhance(tab);
  useAutoTitle(tab);

  const tabRef = useRef(tab);
  tabRef.current = tab;

  const store = main.UI.useStore(main.STORE_ID);
  const enhancedNoteIds = main.UI.useSliceRowIds(
    main.INDEXES.enhancedNotesBySession,
    sessionId,
    main.STORE_ID,
  );
  const enhancedNoteIdsRef = useRef<string[]>([]);
  useEffect(() => {
    enhancedNoteIdsRef.current = enhancedNoteIds ?? [];
  }, [enhancedNoteIds]);

  const {
    attachments,
    attachmentsLoading,
    shouldShowAttachmentsTab,
    attachmentsRef,
    pendingAttachmentInsertionsRef,
    pendingAttachmentSrcUpdatesRef,
    pendingAttachmentSaves,
    handleFilesAdded: sessionHandleFilesAdded,
    handleRemoveAttachment,
  } = useSessionAttachments(sessionId);

  const editorTabs = useEditorTabs({
    sessionId,
    shouldShowAttachments: shouldShowAttachmentsTab,
  });

  const handleTabChange = useCallback(
    (view: EditorView) => {
      updateSessionTabState(tabRef.current, { editor: view });
    },
    [updateSessionTabState],
  );

  const currentTab: EditorView = useCurrentNoteTab(tab);

  useEffect(() => {
    if (currentTab.type !== "attachments") {
      return;
    }
    if (shouldShowAttachmentsTab) {
      return;
    }
    const rawTab = editorTabs.find((view) => view.type === "raw");
    if (rawTab) {
      handleTabChange(rawTab);
      return;
    }
    if (editorTabs[0]) {
      handleTabChange(editorTabs[0]);
    }
  }, [currentTab, shouldShowAttachmentsTab, editorTabs, handleTabChange]);

  useTabShortcuts({
    editorTabs,
    currentTab,
    handleTabChange,
  });

  const mountedEditorView = useMountedEditorView({
    currentTab,
    editorTabs,
  });

  const performAttachmentInsertion = useCallback(
    (editor: TiptapEditor, payload: AttachmentInsertionPayload) => {
      const node = {
        type: "image",
        attrs: {
          src: payload.src,
          attachmentId: payload.id,
        },
      };

      if (typeof payload.position === "number") {
        const inserted = editor
          .chain()
          .focus()
          .insertContentAt(payload.position, node)
          .run();
        if (inserted) {
          return;
        }
      }

      editor.chain().focus().insertContent(node).run();
    },
    [],
  );

  const flushPendingAttachmentInsertions = useCallback(
    (editor: TiptapEditor) => {
      if (pendingAttachmentInsertionsRef.current.length === 0) {
        return;
      }
      const pending = pendingAttachmentInsertionsRef.current;
      pendingAttachmentInsertionsRef.current = [];
      pending.forEach((payload) => performAttachmentInsertion(editor, payload));
    },
    [performAttachmentInsertion],
  );

  const insertAttachmentNode = useCallback(
    (payload: AttachmentInsertionPayload) => {
      const editor = editorRef.current?.editor;
      if (!editor) {
        pendingAttachmentInsertionsRef.current.push(payload);
        return;
      }
      performAttachmentInsertion(editor, payload);
    },
    [performAttachmentInsertion],
  );

  const performAttachmentSrcUpdate = useCallback(
    (editor: TiptapEditor, payload: AttachmentSrcUpdatePayload) => {
      editor.commands.command(({ tr, state, dispatch }) => {
        let modified = false;
        state.doc.descendants((node, pos) => {
          if (node.type.name !== "image") {
            return;
          }
          if (node.attrs.attachmentId === payload.id) {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              src: payload.src,
            });
            modified = true;
          }
        });
        if (!modified) {
          return false;
        }
        if (dispatch) {
          dispatch(tr);
        }
        return true;
      });
    },
    [],
  );

  const flushPendingAttachmentSrcUpdates = useCallback(
    (editor: TiptapEditor) => {
      if (pendingAttachmentSrcUpdatesRef.current.length === 0) {
        return;
      }
      const pending = pendingAttachmentSrcUpdatesRef.current;
      pendingAttachmentSrcUpdatesRef.current = [];
      pending.forEach((update) => performAttachmentSrcUpdate(editor, update));
    },
    [performAttachmentSrcUpdate],
  );

  const updateEditorAttachmentSrc = useCallback(
    (update: AttachmentSrcUpdatePayload) => {
      const editor = editorRef.current?.editor;
      if (!editor) {
        pendingAttachmentSrcUpdatesRef.current.push(update);
        return;
      }
      performAttachmentSrcUpdate(editor, update);
    },
    [performAttachmentSrcUpdate],
  );

  const removeAttachmentNodesFromEditor = useCallback(
    (attachmentId: string, matchSrcs: string[] = []) => {
      const editor = editorRef.current?.editor;
      if (!editor) {
        return;
      }
      editor.commands.command(({ tr, state, dispatch }) => {
        const ranges: Array<{ from: number; to: number }> = [];
        state.doc.descendants((node, pos) => {
          if (node.type.name !== "image") {
            return;
          }
          const matchesId = node.attrs.attachmentId === attachmentId;
          const matchesSrc =
            !node.attrs.attachmentId &&
            matchSrcs.some((src) => src && node.attrs.src === src);
          if (matchesId || matchesSrc) {
            ranges.push({ from: pos, to: pos + node.nodeSize });
          }
        });
        if (ranges.length === 0) {
          return false;
        }
        ranges
          .sort((a, b) => b.from - a.from)
          .forEach(({ from, to }) => {
            tr.delete(from, to);
          });
        if (dispatch) {
          dispatch(tr);
        }
        return true;
      });
    },
    [],
  );

  const handleFilesAdded = useCallback(
    (files: File[], options?: AttachmentInsertOptions) => {
      sessionHandleFilesAdded(files, {
        ...options,
        insertAttachmentNode,
        updateEditorAttachmentSrc: updateEditorAttachmentSrc,
        removeAttachmentNodesFromEditor,
      });
    },
    [
      sessionHandleFilesAdded,
      insertAttachmentNode,
      removeAttachmentNodesFromEditor,
      updateEditorAttachmentSrc,
    ],
  );

  const handleEditorRef = useCallback(
    (instance: { editor: TiptapEditor | null } | null) => {
      editorRef.current = instance;
      if (instance?.editor) {
        flushPendingAttachmentInsertions(instance.editor);
        flushPendingAttachmentSrcUpdates(instance.editor);
      }
    },
    [flushPendingAttachmentInsertions, flushPendingAttachmentSrcUpdates],
  );

  const handleContainerClick = () => {
    if (currentTab.type === "transcript" || currentTab.type === "attachments") {
      return;
    }
    editorRef.current?.editor?.commands.focus();
  };

  const handleAttachmentUpload = useCallback(
    (files: File[]) => {
      handleFilesAdded(files);
    },
    [handleFilesAdded],
  );

  const syncAttachmentsWithEditor = useCallback(() => {
    const editor = editorRef.current?.editor;
    if (!editor) {
      return;
    }
    const referencedIds = new Set<string>();
    const nodesMissingIds: Array<{ pos: number; attachmentId: string }> = [];
    const nodesWithMissingAttachments: Array<{ from: number; to: number }> = [];
    const attachmentIdSet = new Set(
      attachmentsRef.current.map((attachment) => attachment.id),
    );

    const attachmentBySrc = new Map<string, Attachment>();
    attachmentsRef.current.forEach((attachment) => {
      if (attachment.fileUrl) {
        attachmentBySrc.set(attachment.fileUrl, attachment);
      }
      if (attachment.objectUrl) {
        attachmentBySrc.set(attachment.objectUrl, attachment);
      }
      if (attachment.thumbnailUrl) {
        attachmentBySrc.set(attachment.thumbnailUrl, attachment);
      }
    });

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== "image") {
        return;
      }
      let attachmentId = node.attrs.attachmentId as string | undefined;

      if (!attachmentId && node.attrs.src) {
        const match = attachmentBySrc.get(node.attrs.src);
        if (match) {
          attachmentId = match.id;
          nodesMissingIds.push({ pos, attachmentId });
        }
      }

      if (attachmentId) {
        referencedIds.add(attachmentId);
        if (!attachmentIdSet.has(attachmentId)) {
          nodesWithMissingAttachments.push({
            from: pos,
            to: pos + node.nodeSize,
          });
        }
      }
    });

    if (nodesMissingIds.length > 0) {
      editor.commands.command(({ tr, state, dispatch }) => {
        let modified = false;
        nodesMissingIds.forEach(({ pos, attachmentId }) => {
          const node = state.doc.nodeAt(pos);
          if (!node) {
            return;
          }
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            attachmentId,
          });
          modified = true;
        });
        if (!modified) {
          return false;
        }
        if (dispatch) {
          dispatch(tr);
        }
        return true;
      });
    }
    if (nodesWithMissingAttachments.length > 0) {
      editor.commands.command(({ tr, dispatch }) => {
        nodesWithMissingAttachments
          .sort((a, b) => b.from - a.from)
          .forEach(({ from, to }) => {
            tr.delete(from, to);
          });
        if (dispatch) {
          dispatch(tr);
        }
        return true;
      });
    }
  }, []);

  const handleEditorContentChange = useCallback(
    (
      content: JSONContent,
      sourceView?: { type: "raw" } | { type: "enhanced"; id: string },
    ) => {
      const { ids: referencedIds, srcs: referencedSrcs } =
        collectAttachmentRefs(content);

      if ([...referencedSrcs].some((src) => src.startsWith("data:"))) {
        console.log(
          "[attachments] detected data URL references; skipping prune",
        );
        return;
      }

      const allReferencedIds = new Set(referencedIds);
      const allReferencedSrcs = new Set(referencedSrcs);

      collectReferencesFromAllViews(
        store,
        sessionId,
        sourceView,
        enhancedNoteIdsRef.current,
        allReferencedIds,
        allReferencedSrcs,
      );

      console.log("[attachments] handleEditorContentChange", {
        referencedIds: Array.from(allReferencedIds),
        referencedSrcs: Array.from(allReferencedSrcs),
        currentAttachments: attachmentsRef.current.map((a) => ({
          id: a.id,
          isPersisted: a.isPersisted,
          pending: pendingAttachmentSaves.current.has(a.id),
        })),
      });

      const attachmentsToRemove = findOrphanedAttachments(
        attachmentsRef.current,
        allReferencedIds,
        allReferencedSrcs,
        pendingAttachmentSaves.current,
      );

      if (attachmentsToRemove.length > 0) {
        console.log(
          "[attachments] removing orphaned attachments",
          attachmentsToRemove.map((a) => a.id),
        );
        attachmentsToRemove.forEach((attachment) => {
          handleRemoveAttachment(attachment.id, { skipStoredViewsPrune: true });
        });
      }

      syncAttachmentsWithEditor();
    },
    [handleRemoveAttachment, syncAttachmentsWithEditor, sessionId, store],
  );

  useEffect(() => {
    if (!attachmentsLoading) {
      syncAttachmentsWithEditor();
    }
  }, [attachmentsLoading, syncAttachmentsWithEditor]);

  useEffect(() => {
    if (!attachmentsLoading) {
      syncAttachmentsWithEditor();
    }
  }, [attachments, attachmentsLoading, syncAttachmentsWithEditor]);

  return (
    <div className="flex flex-col h-full -mx-2">
      <div className="px-2">
        <Header
          sessionId={sessionId}
          editorTabs={editorTabs}
          currentTab={currentTab}
          handleTabChange={handleTabChange}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onUploadAttachments={handleAttachmentUpload}
        />
      </div>

      <div
        onClick={handleContainerClick}
        className={cn([
          "flex-1 mt-2 px-3 relative",
          currentTab.type === "transcript" || currentTab.type === "attachments"
            ? "overflow-hidden"
            : ["overflow-auto", "pb-6"],
        ])}
      >
        <EditorViewContainer
          currentTab={currentTab}
          mountedEditorView={mountedEditorView}
          sessionId={sessionId}
          handleEditorRef={handleEditorRef}
          handleFilesAdded={handleFilesAdded}
          handleContentChange={handleEditorContentChange}
        />

        {currentTab.type === "transcript" && (
          <Transcript sessionId={sessionId} isEditing={isEditing} />
        )}
        {currentTab.type === "attachments" && (
          <Attachments
            attachments={attachments}
            isLoading={attachmentsLoading}
            onRemoveAttachment={handleRemoveAttachment}
          />
        )}
      </div>
    </div>
  );
}

function cleanupObjectUrls(urls: Set<string>) {
  urls.forEach((url) => {
    URL.revokeObjectURL(url);
  });
  urls.clear();
}

function useSessionAttachments(sessionId: string) {
  const store = main.UI.useStore(main.STORE_ID);
  const indexes = main.UI.useIndexes(main.STORE_ID);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);
  const shouldShowAttachmentsTab =
    !attachmentsLoading && attachments.length > 0;

  const attachmentsRef = useRef<Attachment[]>([]);
  attachmentsRef.current = attachments;

  const pendingAttachmentInsertionsRef = useRef<AttachmentInsertionPayload[]>(
    [],
  );
  const pendingAttachmentSrcUpdatesRef = useRef<AttachmentSrcUpdatePayload[]>(
    [],
  );
  const createdAttachmentUrls = useRef(new Set<string>());
  const pendingAttachmentSaves = useRef(
    new Map<
      string,
      {
        cancelled: boolean;
      }
    >(),
  );

  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  useEffect(() => {
    let cancelled = false;

    setAttachments([]);
    setAttachmentsLoading(true);

    loadSessionAttachments(sessionId)
      .then((loaded) => {
        if (cancelled) {
          return;
        }
        const persisted = loaded.map((record) =>
          mapPersistedAttachment(record),
        );
        setAttachments((prev) => {
          const optimistic = prev.filter(
            (attachment) => !attachment.isPersisted,
          );
          const optimisticIds = new Set(
            optimistic.map((attachment) => attachment.id),
          );
          const mergedPersisted = persisted.filter(
            (attachment) => !optimisticIds.has(attachment.id),
          );
          return [...optimistic, ...mergedPersisted];
        });
      })
      .catch((error) => {
        if (error instanceof ManifestCorruptionError) {
          console.error(
            "[attachments] CRITICAL: manifest corruption detected",
            error,
          );
        } else {
          console.error("[attachments] failed to load", error);
        }
        if (!cancelled) {
          setAttachments([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAttachmentsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      pendingAttachmentSaves.current.forEach((entry) => {
        entry.cancelled = true;
      });
    };
  }, [sessionId]);

  const releaseObjectUrl = useCallback((url: string | undefined) => {
    if (!url) {
      return;
    }
    URL.revokeObjectURL(url);
    createdAttachmentUrls.current.delete(url);
  }, []);

  const removeAttachmentNodesFromStoredViews = useCallback(
    (attachment: Attachment) => {
      if (!store || !indexes) {
        return;
      }

      const prune = (serialized: unknown) => {
        if (typeof serialized !== "string" || !serialized.trim()) {
          return null;
        }
        const parsed = safeParseJSON(serialized);
        if (!parsed || !isValidTiptapContent(parsed)) {
          return null;
        }
        const { removed, content } = pruneAttachmentFromJson(
          parsed,
          attachment,
        );
        if (!removed) {
          return null;
        }
        return JSON.stringify(content);
      };

      const rawMd = store.getCell("sessions", sessionId, "raw_md");
      const nextRaw = prune(rawMd);
      if (nextRaw !== null) {
        store.setPartialRow("sessions", sessionId, { raw_md: nextRaw });
      }

      const enhancedNoteIds = indexes.getSliceRowIds(
        main.INDEXES.enhancedNotesBySession,
        sessionId,
      );

      enhancedNoteIds.forEach((noteId) => {
        const content = store.getCell("enhanced_notes", noteId, "content");
        const next = prune(content);
        if (next !== null) {
          store.setPartialRow("enhanced_notes", noteId, { content: next });
        }
      });
    },
    [indexes, sessionId, store],
  );

  const handleRemoveAttachment = useCallback(
    (id: string, options?: { skipStoredViewsPrune?: boolean }) => {
      console.log("[attachments] handleRemoveAttachment", {
        id,
        skipStoredViewsPrune: options?.skipStoredViewsPrune,
      });

      const attachmentToRemove = attachmentsRef.current.find(
        (attachment) => attachment.id === id,
      );
      if (attachmentToRemove?.objectUrl) {
        releaseObjectUrl(attachmentToRemove.objectUrl);
      }

      setAttachments((prev) =>
        prev.filter((attachment) => attachment.id !== id),
      );

      const pending = pendingAttachmentSaves.current.get(id);
      if (pending) {
        console.log("[attachments] cancelling pending save", id);
        pending.cancelled = true;
      } else {
        console.log("[attachments] removing from storage", id);
        void removeSessionAttachment(sessionId, id).catch((error) => {
          console.error("[attachments] failed to remove", error);
        });
      }

      if (!options?.skipStoredViewsPrune && attachmentToRemove) {
        removeAttachmentNodesFromStoredViews(attachmentToRemove);
      }
    },
    [removeAttachmentNodesFromStoredViews, releaseObjectUrl, sessionId],
  );

  const handleFilesAdded = useCallback(
    (
      files: File[],
      options?: AttachmentInsertOptions & {
        insertAttachmentNode?: (payload: AttachmentInsertionPayload) => void;
        updateEditorAttachmentSrc?: (
          payload: AttachmentSrcUpdatePayload,
        ) => void;
        removeAttachmentNodesFromEditor?: (
          attachmentId: string,
          matchSrcs?: string[],
        ) => void;
      },
    ) => {
      let processedCount = 0;
      const seenSignatures = new Set<string>();

      console.log("[attachments] handleFilesAdded", {
        fileCount: files.length,
        options,
      });

      const insertNode =
        options?.insertAttachmentNode ??
        (() => {
          /* no-op */
        });

      const updateSrc =
        options?.updateEditorAttachmentSrc ??
        (() => {
          /* no-op */
        });

      const removeFromEditor =
        options?.removeAttachmentNodesFromEditor ??
        (() => {
          /* no-op */
        });

      files.forEach((file) => {
        if (!file.type.startsWith("image/")) {
          console.log("[attachments] skip non-image file", file.name);
          return;
        }

        const signature = `${file.name}-${file.size}-${file.lastModified}-${file.type}`;
        if (seenSignatures.has(signature)) {
          console.log("[attachments] skip duplicate file", file.name);
          return;
        }
        seenSignatures.add(signature);

        const attachmentId = crypto.randomUUID();
        const objectUrl = URL.createObjectURL(file);
        createdAttachmentUrls.current.add(objectUrl);
        pendingAttachmentSaves.current.set(attachmentId, { cancelled: false });

        console.log("[attachments] adding optimistic attachment", {
          id: attachmentId,
          fileName: file.name,
          objectUrl,
        });

        const optimisticAttachment: Attachment = {
          id: attachmentId,
          type: "image",
          title: file.name || "Image",
          addedAt: new Date().toISOString(),
          thumbnailUrl: objectUrl,
          objectUrl,
          mimeType: file.type,
          size: file.size,
          isPersisted: false,
        };

        setAttachments((prev) => [optimisticAttachment, ...prev]);

        insertNode({
          id: attachmentId,
          src: objectUrl,
          position:
            processedCount === 0 ? (options?.position ?? undefined) : undefined,
        });
        processedCount += 1;

        const sessionForSave = sessionId;

        void saveSessionAttachment(sessionForSave, file, attachmentId)
          .then((saved) => {
            const pending = pendingAttachmentSaves.current.get(attachmentId);
            pendingAttachmentSaves.current.delete(attachmentId);

            console.log("[attachments] save complete", {
              id: attachmentId,
              savedId: saved.id,
              sessionChanged: sessionIdRef.current !== sessionForSave,
              wasCancelled: pending?.cancelled,
            });

            const sessionChanged = sessionIdRef.current !== sessionForSave;
            const wasCancelled = pending?.cancelled;

            releaseObjectUrl(objectUrl);

            if (sessionChanged || wasCancelled) {
              console.log(
                "[attachments] discarding saved attachment",
                saved.id,
              );
              void removeSessionAttachment(sessionForSave, saved.id);
              removeFromEditor(attachmentId, [objectUrl, saved.fileUrl]);
              setAttachments((prev) =>
                prev.filter((attachment) => attachment.id !== attachmentId),
              );
              return;
            }

            setAttachments((prev) => {
              const indexToUpdate = prev.findIndex(
                (attachment) => attachment.id === attachmentId,
              );
              if (indexToUpdate === -1) {
                return prev;
              }
              const next = [...prev];
              next[indexToUpdate] = {
                ...prev[indexToUpdate],
                ...mapPersistedAttachment(saved),
                objectUrl: undefined,
              };
              return next;
            });

            updateSrc({
              id: attachmentId,
              src: saved.fileUrl,
            });
          })
          .catch((error) => {
            pendingAttachmentSaves.current.delete(attachmentId);
            console.error("[attachments] failed to save", error);
            releaseObjectUrl(objectUrl);
            removeFromEditor(attachmentId, [objectUrl]);
            setAttachments((prev) =>
              prev.filter((attachment) => attachment.id !== attachmentId),
            );
          });
      });
    },
    [releaseObjectUrl, sessionId],
  );

  useEffect(() => {
    return () => {
      cleanupObjectUrls(createdAttachmentUrls.current);
    };
  }, [sessionId]);

  return {
    attachments,
    attachmentsLoading,
    shouldShowAttachmentsTab,
    attachmentsRef,
    pendingAttachmentInsertionsRef,
    pendingAttachmentSrcUpdatesRef,
    pendingAttachmentSaves,
    handleFilesAdded,
    handleRemoveAttachment,
  };
}

function mapPersistedAttachment(record: PersistedAttachment): Attachment {
  return {
    id: record.id,
    type: "image",
    title: record.title || record.fileName,
    addedAt: record.addedAt,
    thumbnailUrl: record.fileUrl,
    fileUrl: record.fileUrl,
    mimeType: record.mimeType,
    size: record.size,
    isPersisted: true,
  };
}

function getAttachmentSrcCandidates(attachment: Attachment): string[] {
  return [
    attachment.fileUrl,
    attachment.objectUrl,
    attachment.thumbnailUrl,
  ].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
}

function collectAttachmentRefs(content: JSONContent | null | undefined) {
  const ids = new Set<string>();
  const srcs = new Set<string>();

  const visit = (node: JSONContent | undefined) => {
    if (!node) {
      return;
    }

    if (node.type === "image") {
      const nodeId = node.attrs?.attachmentId;
      const nodeSrc = node.attrs?.src;
      if (typeof nodeId === "string" && nodeId.length > 0) {
        ids.add(nodeId);
      }
      if (typeof nodeSrc === "string" && nodeSrc.length > 0) {
        srcs.add(nodeSrc);
      }
    }

    if (Array.isArray(node.content)) {
      node.content.forEach((child) => {
        visit(child as JSONContent);
      });
    }
  };

  visit(content ?? undefined);

  return { ids, srcs };
}

function pruneAttachmentFromJson(
  root: JSONContent,
  attachment: Attachment,
): { removed: boolean; content: JSONContent } {
  const srcCandidates = getAttachmentSrcCandidates(attachment);
  let removed = false;

  const pruneNode = (node: JSONContent | undefined): JSONContent | null => {
    if (!node) {
      return null;
    }

    if (node.type === "image") {
      const nodeId = node.attrs?.attachmentId;
      const nodeSrc = node.attrs?.src;
      const matchesId = typeof nodeId === "string" && nodeId === attachment.id;
      const matchesSrc =
        (!nodeId || nodeId === "") &&
        typeof nodeSrc === "string" &&
        srcCandidates.includes(nodeSrc);

      if (matchesId || matchesSrc) {
        removed = true;
        return null;
      }
    }

    if (!Array.isArray(node.content)) {
      return node;
    }

    const nextContent: JSONContent[] = [];
    let changed = false;
    node.content.forEach((child) => {
      const prunedChild = pruneNode(child as JSONContent);
      if (prunedChild) {
        nextContent.push(prunedChild);
        if (prunedChild !== child) {
          changed = true;
        }
      } else {
        changed = true;
      }
    });

    if (!changed) {
      return node;
    }

    return { ...node, content: nextContent };
  };

  const pruned = pruneNode(root);
  if (!removed) {
    return { removed: false, content: root };
  }

  if (!pruned) {
    return { removed: true, content: EMPTY_TIPTAP_DOC };
  }

  return { removed: true, content: pruned };
}

function safeParseJSON(value: string): JSONContent | null {
  try {
    return JSON.parse(value) as JSONContent;
  } catch {
    return null;
  }
}

function useTabShortcuts({
  editorTabs,
  currentTab,
  handleTabChange,
}: {
  editorTabs: EditorView[];
  currentTab: EditorView;
  handleTabChange: (view: EditorView) => void;
}) {
  useHotkeys(
    "alt+s",
    () => {
      const enhancedTabs = editorTabs.filter((t) => t.type === "enhanced");
      if (enhancedTabs.length === 0) return;

      if (currentTab.type === "enhanced") {
        const currentIndex = enhancedTabs.findIndex(
          (t) => t.type === "enhanced" && t.id === currentTab.id,
        );
        const nextIndex = (currentIndex + 1) % enhancedTabs.length;
        handleTabChange(enhancedTabs[nextIndex]);
      } else {
        handleTabChange(enhancedTabs[0]);
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [currentTab, editorTabs, handleTabChange],
  );

  useHotkeys(
    "alt+m",
    () => {
      const rawTab = editorTabs.find((t) => t.type === "raw");
      if (rawTab && currentTab.type !== "raw") {
        handleTabChange(rawTab);
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [currentTab, editorTabs, handleTabChange],
  );

  useHotkeys(
    "alt+t",
    () => {
      const transcriptTab = editorTabs.find((t) => t.type === "transcript");
      if (transcriptTab && currentTab.type !== "transcript") {
        handleTabChange(transcriptTab);
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [currentTab, editorTabs, handleTabChange],
  );

  useHotkeys(
    "alt+a",
    () => {
      const attachmentsTab = editorTabs.find((t) => t.type === "attachments");
      if (attachmentsTab && currentTab.type !== "attachments") {
        handleTabChange(attachmentsTab);
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [currentTab, editorTabs, handleTabChange],
  );
}

function EditorViewContainer({
  currentTab,
  mountedEditorView,
  sessionId,
  handleEditorRef,
  handleFilesAdded,
  handleContentChange,
}: {
  currentTab: EditorView;
  mountedEditorView: MountedEditorView;
  sessionId: string;
  handleEditorRef: (instance: { editor: TiptapEditor | null } | null) => void;
  handleFilesAdded: (files: File[], options?: AttachmentInsertOptions) => void;
  handleContentChange: (
    content: JSONContent,
    sourceView?: { type: "raw" } | { type: "enhanced"; id: string },
  ) => void;
}) {
  const editorViewToRender =
    currentTab.type === "raw" || currentTab.type === "enhanced"
      ? currentTab
      : mountedEditorView;

  const handleRawContentChange = useCallback(
    (content: JSONContent) => {
      handleContentChange(content, { type: "raw" });
    },
    [handleContentChange],
  );

  const handleEnhancedContentChange = useCallback(
    (content: JSONContent) => {
      if (editorViewToRender?.type === "enhanced") {
        handleContentChange(content, {
          type: "enhanced",
          id: editorViewToRender.id,
        });
      }
    },
    [handleContentChange, editorViewToRender],
  );

  const allowFileDrop = editorViewToRender?.type === "raw";

  return (
    <div
      data-allow-file-drop={allowFileDrop ? "true" : undefined}
      className={cn([
        currentTab.type === "raw" || currentTab.type === "enhanced"
          ? "block"
          : "hidden",
        "h-full",
      ])}
    >
      {editorViewToRender?.type === "raw" ? (
        <RawEditor
          ref={handleEditorRef}
          sessionId={sessionId}
          onFilesAdded={handleFilesAdded}
          onContentChange={handleRawContentChange}
        />
      ) : editorViewToRender?.type === "enhanced" ? (
        <Enhanced
          ref={handleEditorRef}
          sessionId={sessionId}
          enhancedNoteId={editorViewToRender.id}
          onContentChange={handleEnhancedContentChange}
        />
      ) : null}
    </div>
  );
}

type MountedEditorView = Extract<EditorView, { type: "raw" | "enhanced" }>;

function useMountedEditorView({
  currentTab,
  editorTabs,
}: {
  currentTab: EditorView;
  editorTabs: EditorView[];
}): MountedEditorView {
  const initialEditorView = useMemo<MountedEditorView>(() => {
    if (currentTab.type === "raw" || currentTab.type === "enhanced") {
      return currentTab;
    }
    const rawTab = editorTabs.find(
      (tab): tab is Extract<EditorView, { type: "raw" }> => tab.type === "raw",
    );
    if (rawTab) {
      return rawTab;
    }
    const enhancedTab = editorTabs.find(
      (tab): tab is Extract<EditorView, { type: "enhanced" }> =>
        tab.type === "enhanced",
    );
    if (enhancedTab) {
      return enhancedTab;
    }
    return { type: "raw" };
  }, [currentTab, editorTabs]);

  const [mountedEditorView, setMountedEditorView] =
    useState<MountedEditorView>(initialEditorView);

  useEffect(() => {
    if (currentTab.type === "raw" || currentTab.type === "enhanced") {
      setMountedEditorView(currentTab);
    }
  }, [currentTab]);

  useEffect(() => {
    if (
      mountedEditorView.type === "enhanced" &&
      !editorTabs.some(
        (tab) => tab.type === "enhanced" && tab.id === mountedEditorView.id,
      )
    ) {
      const rawTab = editorTabs.find(
        (tab): tab is Extract<EditorView, { type: "raw" }> =>
          tab.type === "raw",
      );
      if (rawTab) {
        setMountedEditorView(rawTab);
        return;
      }
      const enhancedTab = editorTabs.find(
        (tab): tab is Extract<EditorView, { type: "enhanced" }> =>
          tab.type === "enhanced",
      );
      if (enhancedTab) {
        setMountedEditorView(enhancedTab);
        return;
      }
      setMountedEditorView({ type: "raw" });
    }
  }, [editorTabs, mountedEditorView]);

  return mountedEditorView;
}

function collectReferencesFromAllViews(
  store: ReturnType<typeof main.UI.useStore> | undefined,
  sessionId: string,
  sourceView: { type: "raw" } | { type: "enhanced"; id: string } | undefined,
  enhancedNoteIds: string[],
  allReferencedIds: Set<string>,
  allReferencedSrcs: Set<string>,
) {
  if (!store) {
    return;
  }

  if (!sourceView || sourceView.type !== "raw") {
    const rawMd = store.getCell("sessions", sessionId, "raw_md");
    if (typeof rawMd === "string" && rawMd.trim()) {
      const parsed = safeParseJSON(rawMd);
      if (parsed && isValidTiptapContent(parsed)) {
        const { ids, srcs } = collectAttachmentRefs(parsed);
        ids.forEach((id) => allReferencedIds.add(id));
        srcs.forEach((src) => allReferencedSrcs.add(src));
      }
    }
  }

  enhancedNoteIds.forEach((noteId) => {
    if (sourceView?.type === "enhanced" && sourceView.id === noteId) {
      return;
    }
    const noteMd = store.getCell("enhanced_notes", noteId, "content");
    if (typeof noteMd === "string" && noteMd.trim()) {
      const parsed = safeParseJSON(noteMd);
      if (parsed && isValidTiptapContent(parsed)) {
        const { ids, srcs } = collectAttachmentRefs(parsed);
        ids.forEach((id) => allReferencedIds.add(id));
        srcs.forEach((src) => allReferencedSrcs.add(src));
      }
    }
  });
}

function findOrphanedAttachments(
  attachments: Attachment[],
  allReferencedIds: Set<string>,
  allReferencedSrcs: Set<string>,
  pendingAttachmentSaves: Map<string, { cancelled: boolean }>,
): Attachment[] {
  return attachments.filter((attachment) => {
    if (!attachment.isPersisted) {
      console.log("[attachments] skip remove (not persisted)", attachment.id);
      return false;
    }
    if (pendingAttachmentSaves.has(attachment.id)) {
      console.log("[attachments] skip remove (pending save)", attachment.id);
      return false;
    }
    if (allReferencedIds.has(attachment.id)) {
      console.log("[attachments] keep (referenced by ID)", attachment.id);
      return false;
    }
    const candidates = getAttachmentSrcCandidates(attachment);
    const isReferencedBySrc = candidates.some((src) =>
      allReferencedSrcs.has(src),
    );
    if (isReferencedBySrc) {
      console.log("[attachments] keep (referenced by src)", attachment.id);
    } else {
      console.log("[attachments] REMOVE (not referenced)", attachment.id);
    }
    return !isReferencedBySrc;
  });
}
