import type { TiptapEditor } from "@hypr/tiptap/editor";
import { RefObject, createRef } from "react";

/**
 * Global reference to the enhanced note editor
 * This allows other components (like chat tools) to access the editor directly
 */
export const globalEditorRef: RefObject<TiptapEditor | null> = createRef();
