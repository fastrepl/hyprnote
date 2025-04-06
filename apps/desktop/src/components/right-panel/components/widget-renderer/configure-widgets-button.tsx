import { type LinkProps } from "@tanstack/react-router";
import { ReactNode } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";

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

    const url = `${params.to}?current=${params.search.tab}`;

    windowsCommands.windowShow({ type: "settings" }).then(() => {
      setTimeout(() => {
        windowsCommands.windowEmitNavigate({ type: "settings" }, url);
      }, 500);
    });
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
