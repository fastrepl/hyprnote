import { useState, useSyncExternalStore } from "react";

import { useAuth } from "@/auth/context";
import { SettingsRow } from "@/settings/components";
import { FieldGroup } from "@/settings/field-group";
import { Button, Text } from "@/settings/fields";
import {
  getMobileSyncActivity,
  getMobileSyncSnapshot,
  subscribeMobileSync,
} from "@/sync/mobile-sync";
import { syncStatusPresentation } from "@/sync/status-presentation";

export function SyncLog() {
  const auth = useAuth();
  const activity = useSyncExternalStore(
    subscribeMobileSync,
    getMobileSyncActivity,
    getMobileSyncActivity,
  );
  const snapshot = useSyncExternalStore(
    subscribeMobileSync,
    getMobileSyncSnapshot,
    getMobileSyncSnapshot,
  );
  const [open, setOpen] = useState(false);
  const entries =
    snapshot.accountUserId === auth.session?.user.id ? activity : [];

  return (
    <FieldGroup.Section title="Sync log">
      <Button
        label={open ? "Hide sync log" : "View sync log"}
        onPress={() => setOpen((value) => !value)}
      />
      {open && (
        <>
          <FieldGroup.SectionFooter>
            <Text>
              Recent sync status changes since this app opened, newest first.
              This history resets when the app restarts. Note contents and
              credentials are not included.
            </Text>
          </FieldGroup.SectionFooter>
          {entries.length === 0 ? (
            <Text>No sync activity yet.</Text>
          ) : (
            entries.map(({ atMs, status }, index) => {
              const presentation = syncStatusPresentation(
                { ...status, accountUserId: null, hasRecoveryKey: false },
                atMs,
              );
              return (
                <SettingsRow
                  key={`${atMs}-${index}`}
                  title={`${new Date(atMs).toLocaleString()} · ${presentation.healthy ? "Synced" : presentation.title}`}
                  description={[
                    presentation.detail ?? presentation.description,
                    `Background sync: ${status.running ? "running" : "stopped"}.`,
                    `Pending changes: ${status.hasUnsentChanges === null ? "unknown" : status.hasUnsentChanges ? "yes" : "no"}.`,
                    `Consecutive failures: ${status.consecutiveFailures}.`,
                  ].join(" ")}
                />
              );
            })
          )}
        </>
      )}
    </FieldGroup.Section>
  );
}
