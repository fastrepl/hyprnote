import { useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@hypr/ui/components/ui/button";

export function BackButton() {
  const { history } = useRouter();

  const handleClickBack = useCallback(() => {
    history.back();
  }, [history]);

  if (!history.canGoBack()) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="hover:bg-neutral-200"
      onClick={handleClickBack}
      aria-label="Go back"
    >
      <ArrowLeft className="size-4" />
    </Button>
  );
}
