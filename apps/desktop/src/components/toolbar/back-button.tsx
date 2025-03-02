import { useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter, useLocation } from "@tanstack/react-router";
import { Button } from "@hypr/ui/components/ui/button";

import type { RoutePath } from "@/types";

export function BackButton() {
  const { history } = useRouter();
  const { pathname } = useLocation();

  const handleClickBack = useCallback(() => {
    history.back();
  }, [history]);

  const checker = ("/app/note/$id" satisfies RoutePath).slice(0, 9);
  const showBackButton = pathname.includes(checker);

  if (!showBackButton) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="hover:bg-neutral-200 disabled:opacity-0"
      onClick={handleClickBack}
      disabled={!history.canGoBack()}
      aria-label="Go back"
    >
      <ArrowLeft className="size-4" />
    </Button>
  );
}
