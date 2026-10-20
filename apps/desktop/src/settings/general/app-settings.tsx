import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import { platform } from "@tauri-apps/plugin-os";

import { Button } from "@anlg/ui/components/ui/button";

import { SettingSwitchRow } from "~/settings/setting-row";
import { useTabs } from "~/store/zustand/tabs";

export const privacyMessages = {
  title: msg`Privacy`,
  posthogTitle: msg`Share usage data`,
  posthogDescription: msg`Help improve Anarlog with anonymous usage data.`,
};

interface SettingItem {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

interface AppSettingsViewProps {
  appStoreBuild: boolean;
  autostart: SettingItem;
  automaticUpdates: SettingItem;
  showAppInDock: SettingItem;
  showTrayIcon: SettingItem;
}

export function AppSettingsView({
  appStoreBuild,
  autostart,
  automaticUpdates,
  showAppInDock,
  showTrayIcon,
}: AppSettingsViewProps) {
  const openNew = useTabs((state) => state.openNew);
  const version = useQuery({
    queryKey: ["app-version"],
    queryFn: getVersion,
    staleTime: Infinity,
  });
  const currentPlatform = platform();
  const isMacos = currentPlatform === "macos";

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="flex flex-col gap-4">
          {!appStoreBuild && (
            <>
              <SettingSwitchRow
                title={<Trans>Start Anarlog at login</Trans>}
                description={
                  <Trans>Have Anarlog ready when you sign in.</Trans>
                }
                checked={autostart.value}
                onChange={autostart.onChange}
              />
              <SettingSwitchRow
                title={<Trans>Automatically install updates</Trans>}
                description={
                  <Trans>
                    Stay current with updates installed the next time Anarlog
                    opens.
                  </Trans>
                }
                checked={automaticUpdates.value}
                onChange={automaticUpdates.onChange}
              />
            </>
          )}
          <Button
            variant="outline"
            className="self-start"
            disabled={!version.data}
            onClick={() => {
              if (version.data) {
                openNew({
                  type: "changelog",
                  state: { current: version.data, previous: version.data },
                });
              }
            }}
          >
            <Trans>Show release notes</Trans>
          </Button>
          {isMacos && (
            <SettingSwitchRow
              title={<Trans>Show app in Dock</Trans>}
              description={
                <Trans>Show Anarlog in the Dock and app switcher.</Trans>
              }
              checked={showAppInDock.value}
              onChange={showAppInDock.onChange}
            />
          )}
          <SettingSwitchRow
            title={<Trans>Show tray icon</Trans>}
            description={
              isMacos ? (
                <Trans>Open Anarlog from the menu bar.</Trans>
              ) : undefined
            }
            checked={showTrayIcon.value}
            onChange={showTrayIcon.onChange}
          />
        </div>
      </section>
    </div>
  );
}
