import { LogIn, LogOut } from "lucide-react";
import { useCallback } from "react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";

type AuthSectionProps = {
  isAuthenticated: boolean;
  onSignOut: () => Promise<void> | void;
};

export function AuthSection({ isAuthenticated, onSignOut }: AuthSectionProps) {
  const handleOpenAccount = useCallback(async () => {
    await windowsCommands.windowShow({ type: "settings" });
    await windowsCommands.windowNavigate(
      { type: "settings" },
      "/app/settings?tab=account",
    );
  }, []);

  if (isAuthenticated) {
    return (
      <div className="px-1 py-2">
        <Button
          onClick={() => onSignOut()}
          variant="outline"
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log out
        </Button>
      </div>
    );
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
