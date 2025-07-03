import { useParams } from "@tanstack/react-router";
import { message } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { FileText, Share2Icon } from "lucide-react";
import { useState } from "react";

import { useHypr } from "@/contexts";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { Session } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { useSession } from "@hypr/utils/contexts";
import { useMutation } from "@tanstack/react-query";
import { exportToPDF } from "../utils/pdf-export";

export function ShareButton() {
  const param = useParams({ from: "/app/note/$id", shouldThrow: false });
  return param ? <ShareButtonInNote /> : null;
}

function ShareButtonInNote() {
  const { userId } = useHypr();
  const param = useParams({ from: "/app/note/$id", shouldThrow: true });
  const session = useSession(param.id, (s) => s.session);

  const [open, setOpen] = useState(false);
  const hasEnhancedNote = !!session?.enhanced_memo_html;

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      analyticsCommands.event({
        event: "share_option_expanded",
        distinct_id: userId,
      });
    }
  };

  const exportAction = useMutation({
    mutationFn: async (session: Session) => {
      const start = performance.now();
      const result = await exportToPDF(session);
      const elapsed = performance.now() - start;
      if (elapsed < 800) {
        await new Promise((resolve) => setTimeout(resolve, 800 - elapsed));
      }

      return result;
    },
    onMutate: () => {
      analyticsCommands.event({
        event: "share_triggered",
        distinct_id: userId,
        type: "pdf",
      });
    },
    onSuccess: (filePath) => {
      setOpen(false);
      openPath(filePath);
    },
    onError: (error) => {
      message(error.message, { title: "Error", kind: "error" });
    },
  });

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          disabled={!hasEnhancedNote}
          variant="ghost"
          size="icon"
          className="hover:bg-neutral-200"
          aria-label="Share"
        >
          <Share2Icon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3 focus:outline-none focus:ring-0 focus:ring-offset-0"
        align="end"
      >
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Share Enhanced Note</h3>
            <p className="text-xs text-gray-500 mt-0.5">Share your AI-enhanced meeting notes</p>
          </div>
          <div className="space-y-1.5">
            <Button
              onClick={() => exportAction.mutate(session)}
              disabled={exportAction.isPending}
              className="w-full justify-start h-8 text-sm"
              variant="outline"
            >
              <FileText className="size-4 mr-2" />
              {exportAction.isPending ? "Exporting..." : "Export as PDF"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
