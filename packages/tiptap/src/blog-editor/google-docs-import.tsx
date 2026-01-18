import clsx from "clsx";
import { SendIcon } from "lucide-react";
import { useState } from "react";

interface GoogleDocsImportProps {
  onImport: (url: string) => void;
  isLoading?: boolean;
}

export function GoogleDocsImport({
  onImport,
  isLoading,
}: GoogleDocsImportProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (url.trim() && !isLoading) {
      onImport(url.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit(e);
    }
  };

  return (
    <div
      className={clsx([
        "absolute inset-0 flex items-start justify-center pt-0",
        "pointer-events-none",
      ])}
    >
      <form
        onSubmit={handleSubmit}
        className={clsx([
          "flex flex-col gap-3 w-full max-w-md",
          "pointer-events-auto",
        ])}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-neutral-400">
          Paste a Google Docs link to import, or start typing...
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://docs.google.com/document/d/..."
            disabled={isLoading}
            className={clsx([
              "flex-1 px-3 py-2 text-sm",
              "border border-neutral-200 rounded-lg",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "placeholder:text-neutral-300",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            ])}
          />
          <button
            type="submit"
            disabled={!url.trim() || isLoading}
            className={clsx([
              "px-3 py-2 rounded-lg",
              "bg-blue-600 text-white",
              "hover:bg-blue-700",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors",
              "flex items-center gap-2",
            ])}
          >
            {isLoading ? (
              <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <SendIcon className="size-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
