import { type LinkProps } from "@tanstack/react-router";
import { ReactNode } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { safeNavigate } from "@hypr/utils";

interface ConfigureWidgetsButtonProps {
  children?: ReactNode;
}

export function ConfigureWidgetsButton({
  children,
}: ConfigureWidgetsButtonProps) {
  const handleClickConfigureWidgets = () => {
    const params = {
      to: "/app/settings",
      search: { tab: "extensions" },
    } as const satisfies LinkProps;

    const url = `${params.to}?tab=${params.search.tab}`;

    safeNavigate({ type: "settings" }, url);
  };

  return (
    <Button
      onClick={handleClickConfigureWidgets}
      variant="outline"
      size="sm"
      className="rounded-full hover:scale-95 active:scale-90 transition-transform"
    >
      {children}
    </Button>
  );
}
