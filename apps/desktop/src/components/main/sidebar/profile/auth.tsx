import { LogIn, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { cn } from "@hypr/utils";

import { useAuth } from "../../../../auth";

type AuthSectionProps = {
  isAuthenticated: boolean;
  onSignIn: () => Promise<void> | void;
  onSignOut: () => Promise<void> | void;
};

export function AuthSection({
  isAuthenticated,
  onSignIn,
  onSignOut,
}: AuthSectionProps) {
  const [isPending, setIsPending] = useState(false);

  const auth = useAuth();
  const [devMode, setDevMode] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      setIsPending(false);
    }
  }, [isAuthenticated]);

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

  if (isPending) {
    if (devMode) {
      return (
        <div className="px-1 py-2">
          <div
            className={cn([
              "space-y-3",
              "rounded-lg border border-neutral-200",
              "bg-white",
              "p-4",
            ])}
          >
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-900">
                Manual callback
              </p>
              <p className="text-xs text-neutral-600">
                Paste the callback URL below.
              </p>
            </div>
            <div className="space-y-2">
              <Input
                type="text"
                className="text-sm"
                placeholder="hyprnote://auth?access_token=...&refresh_token=..."
                value={callbackUrl}
                onChange={(e) => setCallbackUrl(e.target.value)}
              />
              <Button
                onClick={() => auth?.handleAuthCallback(callbackUrl)}
                variant="default"
                className="w-full"
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="px-1 py-2">
        <div
          className={cn([
            "space-y-3",
            "rounded-lg border border-neutral-200",
            "bg-white",
            "p-4",
          ])}
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-neutral-900">
              Not redirected?
            </p>
            <p className="text-xs text-neutral-600">
              Click below to reopen the sign-in page.
            </p>
          </div>
          <div className="space-y-1">
            <Button
              onClick={() => onSignIn()}
              variant="default"
              className="w-full"
            >
              Reopen sign-in page
            </Button>
            {import.meta.env.DEV && (
              <p
                onClick={() => setDevMode(true)}
                className="text-xs text-neutral-600 cursor-pointer hover:text-neutral-900"
              >
                Click here to workaround deeplink.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleStartSignIn = async () => {
    setIsPending(true);
    try {
      await onSignIn();
    } catch (error) {
      setIsPending(false);
      throw error;
    }
  };

  return (
    <div className="px-1 py-2">
      <Button
        onClick={() => handleStartSignIn()}
        variant="default"
        className="w-full"
      >
        <LogIn className="w-4 h-4 mr-2" />
        Sign in
      </Button>
    </div>
  );
}
