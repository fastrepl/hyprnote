"use client";

import { Check, Copy } from "lucide-react";
import { type ComponentPropsWithoutRef, useRef, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";

export function CodeBlock({
  children,
  ...props
}: ComponentPropsWithoutRef<"pre">) {
  const [copied, setCopied] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    const textToCopy = preRef.current?.textContent ?? "";

    if (!textToCopy) return;

    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTooltipOpen(true);
    setTimeout(() => {
      setCopied(false);
      setTooltipOpen(false);
    }, 2000);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="relative group">
        <pre ref={preRef} {...props}>
          {children}
        </pre>
        <Tooltip
          open={tooltipOpen}
          onOpenChange={(open) => {
            setTooltipOpen(open);
            if (!open) setCopied(false);
          }}
        >
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleCopy}
              className="cursor-pointer absolute top-2.5 right-2.5 p-1.5 rounded bg-stone-200/80 hover:bg-stone-300/80 text-stone-600 opacity-0 group-hover:opacity-100 transition-all"
              aria-label={copied ? "Copied" : "Copy code"}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-black text-white rounded-md">
            {copied ? "Copied" : "Copy"}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
