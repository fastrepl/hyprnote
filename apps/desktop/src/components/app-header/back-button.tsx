import { useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter, useLocation } from "@tanstack/react-router";

export function BackButton() {
  const { history } = useRouter();
  const { pathname } = useLocation();

  const handleClickBack = useCallback(() => {
    history.back();
  }, [history]);

  const showBackButton = pathname.startsWith("/note");

  if (!showBackButton) {
    return null;
  }

  return (
    <button
      className="ml-[70px] text-gray-600 hover:text-gray-900 disabled:opacity-0"
      onClick={handleClickBack}
      disabled={!history.canGoBack()}
    >
      <ArrowLeft size={14} />
    </button>
  );
}
