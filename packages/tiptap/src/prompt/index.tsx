import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import readOnlyRangesExtension from "codemirror-readonly-ranges";
import { useMemo } from "react";

export interface ReadOnlyRange {
  from: number;
  to: number;
}

interface PromptEditorProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  readOnlyRanges?: ReadOnlyRange[];
}

export function PromptEditor({
  value,
  onChange,
  placeholder,
  readOnly = false,
  readOnlyRanges = [],
}: PromptEditorProps) {
  const getReadOnlyRanges = useMemo(
    () => (state: EditorState) => {
      if (readOnly || readOnlyRanges.length === 0) {
        return [];
      }

      return readOnlyRanges.map((range) => ({
        from: range.from,
        to: range.to,
      }));
    },
    [readOnly, readOnlyRanges],
  );

  const extensions = useMemo(() => {
    const exts = [];

    if (!readOnly && readOnlyRanges.length > 0) {
      exts.push(readOnlyRangesExtension(getReadOnlyRanges));
    }

    return exts;
  }, [readOnly, readOnlyRanges, getReadOnlyRanges]);

  const theme = useMemo(
    () =>
      EditorView.theme({
        "&": {
          height: "100%",
          fontFamily:
            "var(--font-mono, 'Menlo', 'Monaco', 'Courier New', monospace)",
          fontSize: "13px",
          lineHeight: "1.6",
        },
        ".cm-content": {
          padding: "8px 0",
        },
        ".cm-line": {
          padding: "0 12px",
        },
        ".cm-scroller": {
          overflow: "auto",
        },
        "&.cm-focused": {
          outline: "none",
        },
        ".cm-placeholder": {
          color: "#999",
          fontStyle: "italic",
        },
      }),
    [],
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      basicSetup={{
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLineGutter: false,
        highlightActiveLine: false,
      }}
      extensions={[theme, ...extensions]}
      height="100%"
    />
  );
}
