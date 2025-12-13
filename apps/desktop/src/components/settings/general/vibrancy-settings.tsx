import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";
import { Slider } from "@hypr/ui/components/ui/slider";
import { Switch } from "@hypr/ui/components/ui/switch";

const VIBRANCY_MATERIALS = [
  { value: "Titlebar", label: "Titlebar" },
  { value: "Selection", label: "Selection" },
  { value: "Menu", label: "Menu" },
  { value: "Popover", label: "Popover" },
  { value: "Sidebar", label: "Sidebar" },
  { value: "HeaderView", label: "Header View" },
  { value: "Sheet", label: "Sheet" },
  { value: "WindowBackground", label: "Window Background" },
  { value: "HudWindow", label: "HUD Window" },
  { value: "FullScreenUI", label: "Full Screen UI" },
  { value: "Tooltip", label: "Tooltip" },
  { value: "ContentBackground", label: "Content Background" },
  { value: "UnderWindowBackground", label: "Under Window Background" },
  { value: "UnderPageBackground", label: "Under Page Background" },
] as const;

interface VibrancySettingsViewProps {
  enabled: {
    value: boolean;
    onChange: (value: boolean) => void;
  };
  material: {
    value: string;
    onChange: (value: string) => void;
  };
  radius: {
    value: number;
    onChange: (value: number) => void;
  };
}

export function VibrancySettingsView({
  enabled,
  material,
  radius,
}: VibrancySettingsViewProps) {
  return (
    <div>
      <h2 className="font-semibold mb-4">Window Appearance</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-medium mb-1">Enable window vibrancy</h3>
            <p className="text-xs text-neutral-600">
              Apply a translucent blur effect to the main window (macOS/Windows
              only)
            </p>
          </div>
          <Switch checked={enabled.value} onCheckedChange={enabled.onChange} />
        </div>

        {enabled.value && (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-medium mb-1">Material type</h3>
                <p className="text-xs text-neutral-600">
                  Choose the visual effect style (macOS only)
                </p>
              </div>
              <Select value={material.value} onValueChange={material.onChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {VIBRANCY_MATERIALS.map((mat) => (
                    <SelectItem key={mat.value} value={mat.value}>
                      {mat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium mb-1">Blur radius</h3>
                  <p className="text-xs text-neutral-600">
                    Adjust the blur intensity (0-100)
                  </p>
                </div>
                <span className="text-sm text-neutral-600 w-8 text-right">
                  {radius.value}
                </span>
              </div>
              <Slider
                value={[radius.value]}
                onValueChange={([value]) => radius.onChange(value)}
                min={0}
                max={100}
                step={1}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
