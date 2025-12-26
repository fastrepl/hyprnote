import {
  type RefObject,
  useCallback,
  useEffect,
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
import { useCaretPosition } from "../caret-position-context";
import { useCurrentNoteTab } from "../shared";
import { Enhanced } from "./enhanced";
import { Header, useEditorTabs } from "./header";
import { RawEditor } from "./raw";
import { Transcript } from "./transcript";

const BOTTOM_THRESHOLD = 112;

export function NoteInput({
  tab,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
}) {
  const editorTabs = useEditorTabs({ sessionId: tab.id });
  const updateSessionTabState = useTabs((state) => state.updateSessionTabState);
  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const caretPosition = useCaretPosition();

  const sessionId = tab.id;
  useAutoEnhance(tab);
  useAutoTitle(tab);

  const tabRef = useRef(tab);
  tabRef.current = tab;

  const currentTab: EditorView = useCurrentNoteTab(tab);
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
    if (currentTab.type === "transcript" && editorRef.current) {
      editorRef.current = { editor: null };
    }
  }, [currentTab]);

  useEffect(() => {
    const editor = editorRef.current?.editor;
    const container = containerRef.current;
    if (
      !editor ||
      !caretPosition ||
      !container ||
      currentTab.type === "transcript"
    ) {
      caretPosition?.setCaretNearBottom(false);
      return;
    }

    const checkCaretPosition = () => {
      if (!containerRef.current || !editor.isFocused) return;

      const { view } = editor;
      const { from } = view.state.selection;
      const coords = view.coordsAtPos(from);

      const distanceFromViewportBottom = window.innerHeight - coords.bottom;

      caretPosition.setCaretNearBottom(
        distanceFromViewportBottom < BOTTOM_THRESHOLD,
      );
    };

    const handleBlur = () => caretPosition.setCaretNearBottom(false);

    editor.on("selectionUpdate", checkCaretPosition);
    editor.on("focus", checkCaretPosition);
    editor.on("blur", handleBlur);
    container.addEventListener("scroll", checkCaretPosition);

    checkCaretPosition();

    return () => {
      editor.off("selectionUpdate", checkCaretPosition);
      editor.off("focus", checkCaretPosition);
      editor.off("blur", handleBlur);
      container.removeEventListener("scroll", checkCaretPosition);
    };
  }, [editorRef.current?.editor, caretPosition, currentTab.type]);

  const handleContainerClick = () => {
    if (currentTab.type !== "transcript") {
      editorRef.current?.editor?.commands.focus();
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
              containerRef.current = node;
            } else {
              containerRef.current = null;
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
              ref={editorRef}
              sessionId={sessionId}
              enhancedNoteId={currentTab.id}
            />
          )}
          {currentTab.type === "raw" && (
            <RawEditor ref={editorRef} sessionId={sessionId} />
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
