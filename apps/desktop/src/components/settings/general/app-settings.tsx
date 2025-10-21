import { SettingRow } from "../shared";

interface SettingItem {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

interface AppSettingsViewProps {
  autostart: SettingItem;
  notificationDetect: SettingItem;
  saveRecordings: SettingItem;
  telemetryConsent: SettingItem;
}

export function AppSettingsView({
  autostart,
  notificationDetect,
  saveRecordings,
  telemetryConsent,
}: AppSettingsViewProps) {
  return (
    <div>
      <h2 className="font-semibold mb-4">App</h2>
      <div className="space-y-6">
        <SettingRow
          title={autostart.title}
          description={autostart.description}
          checked={autostart.value}
          onChange={autostart.onChange}
        />
        <SettingRow
          title={notificationDetect.title}
          description={notificationDetect.description}
          checked={notificationDetect.value}
          onChange={notificationDetect.onChange}
        />
        <SettingRow
          title={saveRecordings.title}
          description={saveRecordings.description}
          checked={saveRecordings.value}
          onChange={saveRecordings.onChange}
        />
        <SettingRow
          title={telemetryConsent.title}
          description={telemetryConsent.description}
          checked={telemetryConsent.value}
          onChange={telemetryConsent.onChange}
        />
      </div>
    </div>
  );
}
