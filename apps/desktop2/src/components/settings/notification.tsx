import { useUpdateGeneral } from "./shared";

export function SettingsNotifications() {
  const { value, handle } = useUpdateGeneral();

  return (
    <div>
      <pre>{JSON.stringify(value, null, 2)}</pre>
      <input
        type="checkbox"
        checked={value.notification_event}
        onChange={(e) => handle.setField("notification_event", e.target.checked)}
      />
      <input
        type="checkbox"
        checked={value.notification_detect}
        onChange={(e) => handle.setField("notification_detect", e.target.checked)}
      />
    </div>
  );
}
