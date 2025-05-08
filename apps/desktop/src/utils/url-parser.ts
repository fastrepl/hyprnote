import React from "react";

export function parseUrlsToLinks(text: string): React.ReactNode[] {
  if (!text) {
    return [text];
  }

  const lines = text.split(/\r?\n/);
  const result: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      result.push(React.createElement("br", { key: `br-${lineIndex}` }));
    }

    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    urlRegex.lastIndex = 0;

    while ((match = urlRegex.exec(line)) !== null) {
      const url = match[0];
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        result.push(line.substring(lastIndex, matchIndex));
      }

      const href = url.startsWith("www.") ? `https://${url}` : url;
      result.push(
        React.createElement("a", {
          key: `url-${lineIndex}-${matchIndex}`,
          href: href,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "text-blue-600 hover:underline",
        }, url),
      );

      lastIndex = matchIndex + url.length;
    }

    if (lastIndex < line.length) {
      result.push(line.substring(lastIndex));
    } else if (lastIndex === 0 && line.length === 0) {
      result.push("");
    }
  });

  return result;
}
