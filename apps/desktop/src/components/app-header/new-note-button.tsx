import { useCallback, useEffect } from "react";
import { Trans } from "@lingui/react/macro";
import { useLocation, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { Button } from "@hypr/ui/components/ui/button";
import { PenIcon } from "lucide-react";

export function NewNoteButton() {
  const { navigate } = useRouter();
  const { pathname } = useLocation();

  const handleClickNewNote = useCallback(() => {
    navigate({ to: "/note/new" });
  }, [navigate]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handleClickNewNote();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [handleClickNewNote]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={clsx([
          "h-7 px-2 text-xs",
          "bg-transparent transition-colors duration-200 hover:bg-white",
          "text-neutral-500 hover:text-neutral-600",
          pathname === "/" ? "opacity-100" : "opacity-0",
          "hidden sm:block",
        ])}
        onClick={handleClickNewNote}
      >
        <Trans>New Note</Trans>
      </Button>
      <button
        className="block items-center justify-center rounded-md p-1 text-sm font-medium text-neutral-600 ring-offset-background transition-colors duration-200 hover:bg-neutral-200 sm:hidden"
        onClick={handleClickNewNote}
      >
        <PenIcon className="size-4" />
        <span className="sr-only">New Note</span>
      </button>
    </>
  );
}
