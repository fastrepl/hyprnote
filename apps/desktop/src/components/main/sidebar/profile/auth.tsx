import { LogIn } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@hypr/ui/components/ui/button";

import { useTabs } from "../../../../store/zustand/tabs";

export function AuthSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const openNew = useTabs((state) => state.openNew);

  const handleOpenAccount = useCallback(() => {
    openNew({ type: "settings", state: { tab: "general" } });
  }, [openNew]);

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
