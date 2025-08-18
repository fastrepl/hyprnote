import TurndownService from "turndown";

const turndown = new TurndownService({ headingStyle: "atx" });

turndown.addRule("p", {
  filter: "p",
  replacement: function(content, node) {
    if (node.parentNode?.nodeName === "LI") {
      return content;
    }

    if (content.trim() === "") {
      return "";
    }

    return `\n\n${content}\n\n`;
  },
});

turndown.addRule("taskList", {
  filter: function(node) {
    return node.nodeName === "UL" && node.getAttribute("data-type") === "taskList";
  },
  replacement: function(content) {
    return content;
  },
});

turndown.addRule("taskItem", {
  filter: function(node) {
    if (node.nodeName !== "LI" || !node.parentNode) {
      return false;
    }
    const parent = node.parentNode as HTMLElement;
    return parent.nodeName === "UL" && parent.getAttribute("data-type") === "taskList";
  },
  replacement: function(content, node) {
    const checkbox = node.querySelector("input[type=\"checkbox\"]") as HTMLInputElement;
    const isChecked = checkbox ? checkbox.checked : false;
    const checkboxSymbol = isChecked ? "[x]" : "[ ]";

    const cleanContent = content.replace(/^\s*\[[\sxX]\]\s*/, "").trim();

    return `- ${checkboxSymbol} ${cleanContent}\n`;
  },
});

export function html2md(html: string) {
  return turndown.turndown(html);
}
