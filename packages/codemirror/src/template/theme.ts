import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

const templateTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontFamily: "var(--font-mono, 'Menlo', 'Monaco', 'Courier New', monospace)",
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
  ".cm-completionIcon": {
    paddingRight: "6px",
  },
  ".cm-tooltip.cm-completionInfo": {
    padding: "4px 8px",
  },
  ".cm-placeholder": {
    color: "#999",
    fontStyle: "italic",
  },
});

const templateHighlightStyle = HighlightStyle.define([
  { tag: tags.brace, color: "#d97706", fontWeight: "600" },
  { tag: tags.variableName, color: "#0369a1", fontWeight: "500" },
  { tag: tags.keyword, color: "#7c3aed", fontWeight: "500" },
  { tag: tags.string, color: "#059669" },
  { tag: tags.operator, color: "#64748b" },
  { tag: tags.propertyName, color: "#0891b2" },
  { tag: tags.comment, color: "#9ca3af", fontStyle: "italic" },
]);

export const templateExtensions = [
  templateTheme,
  syntaxHighlighting(templateHighlightStyle),
];
