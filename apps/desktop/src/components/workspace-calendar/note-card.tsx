import { Trans } from "@lingui/react/macro";
import type { LinkProps } from "@tanstack/react-router";
import { format } from "date-fns";
import { Pen } from "lucide-react";
import { useState } from "react";

import { type Session } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";

export function NoteCard({ session, showTime = false }: { session: Session; showTime?: boolean }) {
  const [open, setOpen] = useState(false);

  const handleClick = (id: string) => {
    setOpen(false);

    const props = {
      to: "/app/note/$id",
      params: { id },
    } as const satisfies LinkProps;

    const url = props.to.replace("$id", props.params.id);

    windowsCommands.windowEmitNavigate("main", url).then(() => {
      windowsCommands.windowShow("main");
    });
  };

  const getStartDate = () => {
    return session.calendar_event_id
      ? new Date(session.created_at)
      : new Date();
  };

  const getEndDate = () => {
    return session.calendar_event_id
      ? new Date(session.created_at)
      : new Date();
  };

  const html2text = (html: string) => {
    return html.replace(/<[^>]*>?/g, "");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-start space-x-1 px-0.5 py-0.5 cursor-pointer rounded hover:bg-neutral-200 transition-colors h-5">
          <div className="w-1 h-3 mt-0.5 rounded-full flex-shrink-0 bg-neutral-600"></div>

          <div className="flex-1 text-xs text-neutral-800 truncate">
            {session.title || "Untitled"}
          </div>

          {showTime && (
            <div className="text-xs text-neutral-500">
              {format(getStartDate(), "h:mm a")} - {format(getEndDate(), "h:mm a")}
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 bg-white border-neutral-200 m-2 shadow-lg outline-none focus:outline-none focus:ring-0">
        <p className="text-sm mb-2 text-neutral-600">
          {format(getStartDate(), "MMM d, h:mm a")}
          {" - "}
          {format(getStartDate(), "yyyy-MM-dd") !== format(getEndDate(), "yyyy-MM-dd")
            ? format(getEndDate(), "MMM d, h:mm a")
            : format(getEndDate(), "h:mm a")}
        </p>

        <div className="font-semibold text-lg mb-1 text-neutral-800">{session.title || "Untitled"}</div>

        <p className="text-sm text-neutral-500 mb-4">
          {html2text(session.enhanced_memo_html || session.raw_memo_html)}
        </p>

        <Button className="w-full inline-flex gap-2" size="md" onClick={() => handleClick(session.id)}>
          <Pen className="size-4" />
          <Trans>Open Note</Trans>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
