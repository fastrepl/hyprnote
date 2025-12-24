import { useQuery } from "@tanstack/react-query";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useCallback, useState } from "react";

import { getRpcCanStartTrial } from "@hypr/api-client";
import { createClient } from "@hypr/api-client/client";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hypr/ui/components/ui/dialog";

import { useAuth } from "../auth";
import { useBillingAccess } from "../billing";
import { env } from "../env";

export function TrialExpiredDialog() {
  const auth = useAuth();
  const { isPro } = useBillingAccess();
  const [dismissed, setDismissed] = useState(false);

  const canTrialQuery = useQuery({
    enabled: !!auth?.session && !isPro,
    queryKey: [
      auth?.session?.user.id ?? "",
      "canStartTrial",
      "trialExpiredDialog",
    ],
    queryFn: async () => {
      const headers = auth?.getHeaders();
      if (!headers) {
        return true;
      }
      const client = createClient({ baseUrl: env.VITE_API_URL, headers });
      const { data, error } = await getRpcCanStartTrial({ client });
      if (error) {
        return true;
      }
      return data?.canStartTrial ?? true;
    },
  });

  const handleUpgrade = useCallback(() => {
    void openUrl(`${env.VITE_APP_URL}/app/checkout?period=monthly`);
    setDismissed(true);
  }, []);

  const isTrialExpired =
    !!auth?.session && !isPro && canTrialQuery.data === false;

  const isOpen = isTrialExpired && !dismissed;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && setDismissed(true)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your trial has ended</DialogTitle>
          <DialogDescription>
            Your 14-day free trial of Hyprnote Pro has expired. Upgrade now to
            continue using all Pro features including cloud transcription and AI
            enhancements.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDismissed(true)}>
            Maybe later
          </Button>
          <Button onClick={handleUpgrade}>Upgrade to Pro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
