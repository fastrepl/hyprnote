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

      <div className="w-72 border rounded-lg overflow-hidden bg-white shadow-sm mx-auto">
        <div className="h-8 bg-neutral-100 border-b flex items-center px-3 gap-2">
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded-full bg-[#FF5F57]" />
            <div className="size-3 rounded-full bg-[#FFBD2E]" />
            <div className="size-3 rounded-full bg-[#28C840]" />
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              {session?.title || "Untitled"}
            </h4>
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
