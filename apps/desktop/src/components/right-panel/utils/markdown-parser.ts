// Simple type for parsed markdown parts
export interface ParsedPart {
  type: "text" | "markdown";
  content: string;
  isComplete?: boolean;
}

export const parseMarkdownBlocks = (text: string): ParsedPart[] => {
  const parts: ParsedPart[] = [];
  let currentIndex = 0;
  let inMarkdownBlock = false;
  let markdownStart = -1;

  for (let i = 0; i < text.length - 2; i++) {
    if (text.slice(i, i + 3) === "```") {
      if (!inMarkdownBlock) {
        // Starting a markdown block
        if (i > currentIndex) {
          // Add text before markdown
          const textContent = text.slice(currentIndex, i).trim();
          if (textContent) {
            parts.push({
              type: "text",
              content: textContent,
            });
          }
        }
        markdownStart = i + 3;
        inMarkdownBlock = true;
        i += 2; // Skip the ```
      } else {
        // Ending a markdown block
        const markdownContent = text.slice(markdownStart, i);
        parts.push({
          type: "markdown",
          content: markdownContent,
          isComplete: true,
        });
        inMarkdownBlock = false;
        currentIndex = i + 3;
        i += 2; // Skip the ```
      }
    }
  }

  // Handle remaining content
  if (inMarkdownBlock) {
    // Incomplete markdown block
    const markdownContent = text.slice(markdownStart);
    parts.push({
      type: "markdown",
      content: markdownContent,
      isComplete: false,
    });
  } else if (currentIndex < text.length) {
    // Remaining text
    const remainingText = text.slice(currentIndex).trim();
    if (remainingText) {
      parts.push({
        type: "text",
        content: remainingText,
      });
    }
  }

  return parts;
};
