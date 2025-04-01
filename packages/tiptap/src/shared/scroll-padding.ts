import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, Transaction, EditorState } from "@tiptap/pm/state";

/**
 * ScrollPadding Extension
 * 
 * This extension adds a custom plugin that adjusts the scroll position
 * after content changes to ensure there's always padding at the bottom.
 */
export const ScrollPadding = Extension.create({
  name: "scrollPadding",
  
  addOptions() {
    return {
      // Bottom padding in pixels
      bottomPadding: 24,
    };
  },
  
  addProseMirrorPlugins() {
    const { bottomPadding } = this.options;
    
    return [
      new Plugin({
        key: new PluginKey("scrollPadding"),
        
        // This hook runs after a transaction is applied
        appendTransaction(transactions: readonly Transaction[], oldState: EditorState, newState: EditorState) {
          // Only proceed if there was a transaction that changed the doc
          const docChanged = transactions.some((tr: Transaction) => tr.docChanged);
          if (!docChanged) return null;
          
          // Get the editor DOM element
          const editorDOM = document.querySelector(".tiptap");
          if (!editorDOM) return null;
          
          // Find the parent scrollable container
          const scrollContainer = document.getElementById("editor-content-area");
          if (!scrollContainer) return null;
          
          // Get the current cursor position
          const { selection } = newState;
          const cursorPos = selection.$head;
          
          // Schedule the scroll adjustment for the next tick to ensure DOM is updated
          setTimeout(() => {
            // Find the DOM node at cursor position
            const posDOM = editorDOM.querySelector("p:last-child, h1:last-child");
            if (!posDOM) return;
            
            // Calculate the position where cursor should be visible with padding
            const posRect = posDOM.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();
            
            // If cursor is near bottom, adjust scroll to maintain padding
            if (posRect.bottom > containerRect.bottom - bottomPadding) {
              const additionalScroll = posRect.bottom - (containerRect.bottom - bottomPadding);
              scrollContainer.scrollTop += additionalScroll;
            }
          }, 0);
          
          return null;
        },
      }),
    ];
  },
});
