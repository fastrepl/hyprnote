import { Switch } from "@hypr/ui/components/ui/switch";
import { useUpdateGeneral } from "./shared";

export function SettingsNotifications() {
  const { value, handle } = useUpdateGeneral();

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Notifications Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Notifications</h2>
        <div className="space-y-6">
          <SettingRow
            title="Event notifications"
            description="Get notified about upcoming calendar events"
            checked={value.notification_event ?? false}
            onChange={(checked) => handle.setField("notification_event", checked)}
          />
          <SettingRow
            title="Audio detection"
            description="Automatically detect and notify when audio/meeting starts"
            checked={value.notification_detect ?? false}
            onChange={(checked) => handle.setField("notification_detect", checked)}
          />
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <h3 className="text-base font-medium mb-1">{title}</h3>
        <p className="text-sm text-neutral-600">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
