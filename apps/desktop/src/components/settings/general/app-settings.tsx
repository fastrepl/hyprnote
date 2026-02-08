import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";
import { Switch } from "@hypr/ui/components/ui/switch";

interface SettingItem {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

interface ThemeSettingItem {
  title: string;
  description: string;
  value: "light" | "dark" | "system";
  onChange: (value: "light" | "dark" | "system") => void;
}

interface AppSettingsViewProps {
  autostart: SettingItem;
  notificationDetect: SettingItem;
  saveRecordings: SettingItem;
  telemetryConsent: SettingItem;
  theme: ThemeSettingItem;
}

export function AppSettingsView({
  autostart,
  notificationDetect,
  saveRecordings,
  telemetryConsent,
  theme,
}: AppSettingsViewProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold font-serif mb-4">App</h2>
      <div className="flex flex-col gap-4">
        <ThemeSettingRow
          title={theme.title}
          description={theme.description}
          value={theme.value}
          onChange={theme.onChange}
        />
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
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <h3 className="text-sm font-medium mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ThemeSettingRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: "light" | "dark" | "system";
  onChange: (value: "light" | "dark" | "system") => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <h3 className="text-sm font-medium mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="system">System</SelectItem>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
