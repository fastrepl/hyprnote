"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";

export function GithubEmbed({
  code,
  fileName,
  language: _language = "bash",
}: {
  code: string;
  fileName: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const lines = code.split("\n");
  // Remove trailing empty line if present
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTooltipOpen(true);
    setTimeout(() => {
      setCopied(false);
      setTooltipOpen(false);
    }, 2000);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="my-4 border border-neutral-200 rounded-sm overflow-hidden bg-stone-50">
        <div className="flex items-center justify-between px-4 py-2 bg-stone-100 border-b border-neutral-200">
          <span className="text-sm font-mono text-stone-600">{fileName}</span>
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
                className="cursor-pointer p-1.5 rounded bg-stone-200/80 hover:bg-stone-300/80 text-stone-600 transition-all"
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="hover:bg-stone-100/50">
                  <td className="select-none text-right pr-4 pl-4 py-0 text-stone-400 text-sm font-mono border-r border-neutral-200 bg-stone-100/50 w-[1%] whitespace-nowrap">
                    {index + 1}
                  </td>
                  <td className="pl-4 pr-4 py-0 text-sm font-mono text-stone-700 whitespace-pre">
                    {line || " "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}
