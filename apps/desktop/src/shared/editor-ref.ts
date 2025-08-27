import type { TiptapEditor } from "@hypr/tiptap/editor";

/**
 * Global reference to the enhanced note editor
 * This allows other components (like chat tools) to access the editor directly
 * Using a mutable object instead of createRef() for reliable cross-component access
 */
export const globalEditorRef = {
  current: null as TiptapEditor | null,
};
