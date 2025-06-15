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

export function html2md(html: string) {
  return turndown.turndown(html);
}
