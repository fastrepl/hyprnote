import {
  forwardRef,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useResizeObserver } from "usehooks-ts";

import type { TiptapEditor } from "@hypr/tiptap/editor";
import { cn } from "@hypr/utils";

import { useAutoEnhance } from "../../../../../hooks/useAutoEnhance";
import { useAutoTitle } from "../../../../../hooks/useAutoTitle";
import { useScrollPreservation } from "../../../../../hooks/useScrollPreservation";
import { type Tab, useTabs } from "../../../../../store/zustand/tabs";
import { type EditorView } from "../../../../../store/zustand/tabs/schema";
import { useCaretNearBottom } from "../caret-position-context";
import { useCurrentNoteTab } from "../shared";
import { Enhanced } from "./enhanced";
import { Header, useEditorTabs } from "./header";
import { RawEditor } from "./raw";
import { Transcript } from "./transcript";

export const NoteInput = forwardRef<
  { editor: TiptapEditor | null },
  {
    tab: Extract<Tab, { type: "sessions" }>;
    onNavigateToTitle?: () => void;
  }
>(({ tab, onNavigateToTitle }, ref) => {
  const editorTabs = useEditorTabs({ sessionId: tab.id });
  const updateSessionTabState = useTabs((state) => state.updateSessionTabState);
  const internalEditorRef = useRef<{ editor: TiptapEditor | null }>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [editor, setEditor] = useState<TiptapEditor | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const sessionId = tab.id;
  useAutoEnhance(tab);
  useAutoTitle(tab);

  const tabRef = useRef(tab);
  tabRef.current = tab;

  const currentTab: EditorView = useCurrentNoteTab(tab);
  useImperativeHandle(
    ref,
    () => internalEditorRef.current ?? { editor: null },
    [currentTab],
  );

  const { scrollRef, onBeforeTabChange } = useScrollPreservation(
    currentTab.type === "enhanced"
      ? `enhanced-${currentTab.id}`
      : currentTab.type,
  );

  const { fadeRef, atStart, atEnd } = useScrollFade<HTMLDivElement>([
    currentTab,
  ]);

  const handleTabChange = useCallback(
    (view: EditorView) => {
      onBeforeTabChange();
      updateSessionTabState(tabRef.current, { editor: view });
    },
    [onBeforeTabChange, updateSessionTabState],
  );

  useTabShortcuts({
    editorTabs,
    currentTab,
    handleTabChange,
  });

  useEffect(() => {
    if (currentTab.type === "transcript") {
      internalEditorRef.current = { editor: null };
      setEditor(null);
    }
  }, [currentTab]);

  useEffect(() => {
    const editorInstance = internalEditorRef.current?.editor ?? null;
    if (editorInstance !== editor) {
      setEditor(editorInstance);
    }
  });

  useEffect(() => {
    const handleContentTransfer = (e: Event) => {
      const customEvent = e as CustomEvent<{ content: string }>;
      const content = customEvent.detail.content;
      const editorInstance = internalEditorRef.current?.editor;

      if (editorInstance && content) {
        const { from } = editorInstance.state.selection;
        editorInstance.commands.insertContentAt(from, [
          { type: "paragraph", content: [{ type: "text", text: content }] },
        ]);
        editorInstance.commands.setTextSelection(from);
        editorInstance.commands.focus();
      }
    };

    const handleMoveToEditorStart = () => {
      const editorInstance = internalEditorRef.current?.editor;
      if (editorInstance) {
        editorInstance.commands.setTextSelection(0);
        editorInstance.commands.focus();
      }
    };

    const handleMoveToEditorPosition = (e: Event) => {
      const customEvent = e as CustomEvent<{ pixelWidth: number }>;
      const pixelWidth = customEvent.detail.pixelWidth;
      const editorInstance = internalEditorRef.current?.editor;

      if (editorInstance) {
        const editorDom = editorInstance.view.dom;
        const firstTextNode = editorDom.querySelector(".ProseMirror > *");

        if (firstTextNode) {
          const editorStyle = window.getComputedStyle(firstTextNode);
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (ctx) {
            ctx.font = `${editorStyle.fontWeight} ${editorStyle.fontSize} ${editorStyle.fontFamily}`;

            const firstBlock = editorInstance.state.doc.firstChild;
            if (firstBlock && firstBlock.textContent) {
              const text = firstBlock.textContent;
              let charPos = 0;

              for (let i = 0; i <= text.length; i++) {
                const currentWidth = ctx.measureText(text.slice(0, i)).width;
                if (currentWidth >= pixelWidth) {
                  charPos = i;
                  break;
                }
                charPos = i;
              }

              const targetPos = Math.min(
                charPos,
                editorInstance.state.doc.content.size - 1,
              );
              editorInstance.commands.setTextSelection(targetPos);
              editorInstance.commands.focus();
              return;
            }
          }
        }

        editorInstance.commands.setTextSelection(0);
        editorInstance.commands.focus();
      }
    };

    window.addEventListener("title-content-transfer", handleContentTransfer);
    window.addEventListener(
      "title-move-to-editor-start",
      handleMoveToEditorStart,
    );
    window.addEventListener(
      "title-move-to-editor-position",
      handleMoveToEditorPosition,
    );
    return () => {
      window.removeEventListener(
        "title-content-transfer",
        handleContentTransfer,
      );
      window.removeEventListener(
        "title-move-to-editor-start",
        handleMoveToEditorStart,
      );
      window.removeEventListener(
        "title-move-to-editor-position",
        handleMoveToEditorPosition,
      );
    };
  }, []);

  useCaretNearBottom({
    editor,
    container,
    enabled: currentTab.type !== "transcript",
  });

  const handleContainerClick = () => {
    if (currentTab.type !== "transcript") {
      internalEditorRef.current?.editor?.commands.focus();
    }
  };

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
        />
      </div>

      <div className="relative flex-1 mt-2 overflow-hidden">
        <div
          ref={(node) => {
            fadeRef.current = node;
            if (currentTab.type !== "transcript") {
              scrollRef.current = node;
              setContainer(node);
            } else {
              setContainer(null);
            }
          }}
          onClick={handleContainerClick}
          className={cn([
            "h-full px-3",
            currentTab.type === "transcript"
              ? "overflow-hidden"
              : ["overflow-auto", "pb-6"],
          ])}
        >
          {currentTab.type === "enhanced" && (
            <Enhanced
              ref={internalEditorRef}
              sessionId={sessionId}
              enhancedNoteId={currentTab.id}
              onNavigateToTitle={onNavigateToTitle}
            />
          )}
          {currentTab.type === "raw" && (
            <RawEditor
              ref={internalEditorRef}
              sessionId={sessionId}
              onNavigateToTitle={onNavigateToTitle}
            />
          )}
          {currentTab.type === "transcript" && (
            <Transcript
              sessionId={sessionId}
              isEditing={isEditing}
              scrollRef={scrollRef}
            />
          )}
        </div>
        {!atStart && <ScrollFadeOverlay position="top" />}
        {!atEnd && <ScrollFadeOverlay position="bottom" />}
      </div>
    </div>
  );
});

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
    "ctrl+alt+left",
    () => {
      const currentIndex = editorTabs.findIndex(
        (t) =>
          (t.type === "enhanced" &&
            currentTab.type === "enhanced" &&
            t.id === currentTab.id) ||
          (t.type === currentTab.type && t.type !== "enhanced"),
      );
      if (currentIndex > 0) {
        handleTabChange(editorTabs[currentIndex - 1]);
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
    "ctrl+alt+right",
    () => {
      const currentIndex = editorTabs.findIndex(
        (t) =>
          (t.type === "enhanced" &&
            currentTab.type === "enhanced" &&
            t.id === currentTab.id) ||
          (t.type === currentTab.type && t.type !== "enhanced"),
      );
      if (currentIndex >= 0 && currentIndex < editorTabs.length - 1) {
        handleTabChange(editorTabs[currentIndex + 1]);
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

function useScrollFade<T extends HTMLElement>(deps: unknown[] = []) {
  const fadeRef = useRef<T>(null);
  const [state, setState] = useState({ atStart: true, atEnd: true });

  const update = useCallback(() => {
    const el = fadeRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    setState({
      atStart: scrollTop <= 1,
      atEnd: scrollTop + clientHeight >= scrollHeight - 1,
    });
  }, []);

  useResizeObserver({ ref: fadeRef as RefObject<T>, onResize: update });

  useEffect(() => {
    const el = fadeRef.current;
    if (!el) return;

    update();
    el.addEventListener("scroll", update);
    return () => el.removeEventListener("scroll", update);
  }, [update, ...deps]);

  return { fadeRef, ...state };
}

function ScrollFadeOverlay({ position }: { position: "top" | "bottom" }) {
  return (
    <div
      className={cn([
        "absolute left-0 w-full h-8 z-20 pointer-events-none",
        position === "top" &&
          "top-0 bg-gradient-to-b from-white to-transparent",
        position === "bottom" &&
          "bottom-0 bg-gradient-to-t from-white to-transparent",
      ])}
    />
  );
}
