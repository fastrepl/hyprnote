import { commands as windowsCommands } from "@hypr/plugin-windows/v1";

import { useAuth } from "../../auth";

export function SettingsDevelopers() {
  const s = useAuth();

  const handleAuth = () => windowsCommands.windowShow({ type: "auth" });

  return (
    <div>
      <pre>{JSON.stringify(s?.session)}</pre>
      <button onClick={handleAuth}>Auth</button>
    </div>
  );
}
