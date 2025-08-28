import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    aiHighlight: {
      /**
       * Set an AI highlight mark
       */
      setAIHighlight: (attributes?: { timestamp?: string; sessionId?: string }) => ReturnType;
      /**
       * Remove an AI highlight mark
       */
      unsetAIHighlight: () => ReturnType;
      /**
       * Toggle an AI highlight mark
       */
      toggleAIHighlight: (attributes?: { timestamp?: string; sessionId?: string }) => ReturnType;
    };
  }
}

export interface AIHighlightOptions {
  HTMLAttributes: Record<string, any>;
}

export const AIHighlight = Mark.create<AIHighlightOptions>({
  name: "aiHighlight",

  addOptions() {
    return {
      HTMLAttributes: {
        class: "ai-generated-highlight",
        "data-ai-highlight": "true",
      },
    };
  },

  addAttributes() {
    return {
      timestamp: {
        default: null,
        parseHTML: element => element.getAttribute("data-timestamp"),
        renderHTML: attributes => {
          if (!attributes.timestamp) {
            return {};
          }
          return {
            "data-timestamp": attributes.timestamp,
          };
        },
      },
      sessionId: {
        default: null,
        parseHTML: element => element.getAttribute("data-session-id"),
        renderHTML: attributes => {
          if (!attributes.sessionId) {
            return {};
          }
          return {
            "data-session-id": attributes.sessionId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [{
      tag: "mark[data-ai-highlight]",
      priority: 100, // Higher priority to ensure it's recognized
    }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setAIHighlight: (attributes?: { timestamp?: string; sessionId?: string }) => ({ commands }) => {
        return commands.setMark(this.name, attributes);
      },
      unsetAIHighlight: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
      toggleAIHighlight: (attributes?: { timestamp?: string; sessionId?: string }) => ({ commands }) => {
        return commands.toggleMark(this.name, attributes);
      },
    };
  },
});
