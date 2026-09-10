import { useMutation } from "@tanstack/react-query";
import { Alert } from "react-native";

import {
  localDatabaseResetRequested,
  requestLocalDatabaseReset,
} from "@/db/reset";
import { SettingsError, SettingsRow } from "@/settings/components";
import { Button } from "@/settings/fields";
import type { MobileSyncPhase } from "@/sync/controller";

// Offered when the local database belongs to another account. The reset only
// leaves a marker; the next launch moves the database aside as a backup and
// opens a fresh one for the signed-in account.
export function StartFreshRow({ phase }: { phase: MobileSyncPhase }) {
  const startFresh = useMutation({
    mutationFn: async () => {
      requestLocalDatabaseReset();
      Alert.alert(
        "Ready to start fresh",
        "Quit Anarlog and open it again. Your previous notes are kept on this device as a backup file, and this account will sync into a new, empty workspace.",
      );
    },
  });
  if (phase !== "account_mismatch") return null;
  const confirmStartFresh = () =>
    Alert.alert(
      "Start fresh on this device?",
      "The notes on this device belong to another account. Starting fresh sets them aside and lets this account sync here. Nothing is uploaded from the old notes.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start fresh",
          style: "destructive",
          onPress: () => startFresh.mutate(),
        },
      ],
    );
  return (
    <>
      {localDatabaseResetRequested() || startFresh.isSuccess ? (
        <SettingsRow
          title="Quit and reopen Anarlog to finish starting fresh"
          description="Your previous notes stay on this device as a backup file."
        />
      ) : (
        <Button
          label="Start fresh on this device"
          disabled={startFresh.isPending}
          onPress={confirmStartFresh}
        />
      )}
      <SettingsError error={startFresh.error} />
    </>
  );
}
