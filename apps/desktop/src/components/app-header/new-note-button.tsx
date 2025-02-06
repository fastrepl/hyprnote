import { useCallback, useEffect } from "react";
import { Trans } from "@lingui/react/macro";
import { useLocation, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { Button } from "@hypr/ui/components/ui/button";

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
    <Button
      variant="outline"
      size="sm"
      className={clsx([
        "h-7 px-2 text-xs",
        "bg-white hover:bg-neutral-100",
        pathname === "/" ? "opacity-100" : "opacity-0",
      ])}
      onClick={handleClickNewNote}
    >
      <Trans>New Note</Trans>
    </Button>
  );
}
