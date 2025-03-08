import { Button } from "@hypr/ui/components/ui/button";
import { type Session } from "@hypr/plugin-db";
import { extractTextFromHtml } from "@/utils";
import { GlobeIcon } from "lucide-react";

export interface PublishTabProps {
  session: Session | null;
}

export const PublishTab = ({ session }: PublishTabProps) => {
  const previewText = session
    ? extractTextFromHtml(session.enhanced_memo_html || session.raw_memo_html)
    : "";

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-1">Publish your note</h3>
        <p className="text-sm text-neutral-600">
          Anyone with the link can view this page
        </p>
      </div>

      {/* Preview of public page */}
      <div className="w-72 border rounded-lg overflow-hidden bg-white shadow-sm mx-auto">
        {/* Mac window chrome */}
        <div className="h-8 bg-neutral-100 border-b flex items-center px-3 gap-2">
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-full bg-[#FF5F57]" />
            <div className="size-3 rounded-full bg-[#FFBD2E]" />
            <div className="size-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <div className="size-4 text-neutral-400">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                </svg>
              </div>
              <span>hyprnote.com</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-500">👆</span>
              <h4 className="text-sm font-medium">
                {session?.title || "Untitled"}
              </h4>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span>Made with Hyprnote</span>
            </div>
          </div>
          <p className="text-sm text-neutral-500 line-clamp-3">
            {previewText || "No content yet"}
          </p>
        </div>
      </div>

      <Button variant="outline">
        <GlobeIcon className="size-4" /> Make it public
      </Button>
    </div>
  );
};
