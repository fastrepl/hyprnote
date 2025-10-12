import { useUpdateGeneral } from "./shared";

export function SettingsGeneral() {
  const { value, handle } = useUpdateGeneral();

  return (
    <div>
      <pre>{JSON.stringify(value, null, 2)}</pre>
      <input
        type="checkbox"
        checked={value.save_recordings}
        onChange={(e) => handle.setField("save_recordings", e.target.checked)}
      />
    </div>
  );
}
