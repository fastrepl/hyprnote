"use client";

import { Check, Copy } from "lucide-react";
import { type ComponentPropsWithoutRef, useRef, useState } from "react";

export function CodeBlock({
  children,
  ...props
}: ComponentPropsWithoutRef<"pre">) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    const textToCopy = preRef.current?.textContent ?? "";

    if (!textToCopy) return;

    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre ref={preRef} {...props}>
        {children}
      </pre>
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
