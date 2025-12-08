import { LogIn } from "lucide-react";
import { useCallback } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";

export function AuthSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const handleOpenAccount = useCallback(async () => {
    await windowsCommands.windowShow({ type: "settings" });
    await windowsCommands.windowNavigate(
      { type: "settings" },
      "/app/settings?tab=account",
    );
  }, []);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="p-1 pt-2">
      <Button onClick={handleOpenAccount} variant="default" className="w-full">
        <LogIn size={16} />
        Sign in
      </Button>
    </div>
  );
}
