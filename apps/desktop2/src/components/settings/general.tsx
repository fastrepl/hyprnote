import { useUpdateConfig } from "./shared";

export function SettingsGeneral() {
  const res = useUpdateConfig();
  if (!res) {
    return null;
  }
  const { value, handle } = res;

  return (
    <div>
      <pre>{JSON.stringify(value, null, 2)}</pre>
      <input
        type="checkbox"
        onChange={(e) => handle.setField("save_recordings", e.target.checked)}
      />
    </div>
  );
}
