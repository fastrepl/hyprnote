"use client";

import { Check, Copy } from "lucide-react";
import { type ComponentPropsWithoutRef, useState } from "react";

export function CodeBlock({
  children,
  ...props
}: ComponentPropsWithoutRef<"pre">) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const codeElement =
      (props as any).ref?.current?.querySelector("code") ||
      document.querySelector("pre code");

    let textToCopy = "";

    if (
      typeof children === "object" &&
      children !== null &&
      "props" in children
    ) {
      const codeChildren = (children as any).props?.children;
      if (typeof codeChildren === "string") {
        textToCopy = codeChildren;
      }
    }

    if (!textToCopy && codeElement) {
      textToCopy = codeElement.textContent || "";
    }

    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative group">
      <pre {...props}>{children}</pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-stone-200/80 hover:bg-stone-300/80 text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={copied ? "Copied" : "Copy code"}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}
