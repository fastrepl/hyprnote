import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    streamingAnimation: {
      markNewContent: () => ReturnType;
    };
  }
}

export const StreamingAnimation = Extension.create({
  name: "streamingAnimation",

  addCommands() {
    return {
      markNewContent: () => ({ editor }) => {
        const editorEl = editor.view.dom;
        const blockElements = editorEl.querySelectorAll("h1, p, ul, ol");

        blockElements.forEach((el) => {
          if (!el.classList.contains("tiptap-animated")) {
            el.classList.add("tiptap-animating");
            el.classList.add("tiptap-animated");
          }
        });

        setTimeout(() => {
          const animatingElements = editorEl.querySelectorAll(".tiptap-animating");
          animatingElements.forEach((el) => {
            el.classList.remove("tiptap-animating");
          });
        }, 1000);

        return true;
      },
    };
  },
});
