import { LANGUAGES_ISO_639_1 } from "@huggingface/languages";
import { AlertTriangle, Check, Link2, Plus, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@hypr/ui/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { Switch } from "@hypr/ui/components/ui/switch";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { useUpdateGeneral } from "./shared";

type ISO_639_1_CODE = keyof typeof LANGUAGES_ISO_639_1;
const SUPPORTED_LANGUAGES: ISO_639_1_CODE[] = [
  "es",
  "it",
  "ko",
  "pt",
  "en",
  "pl",
  "ca",
  "ja",
  "de",
  "ru",
  "nl",
  "fr",
  "id",
  "uk",
  "tr",
  "ms",
  "sv",
  "zh",
  "fi",
  "no",
  "ro",
  "th",
  "vi",
  "sk",
  "ar",
  "cs",
  "hr",
  "el",
  "sr",
  "da",
  "bg",
  "hu",
  "tl",
  "bs",
  "gl",
  "mk",
  "hi",
  "et",
  "sl",
  "ta",
  "lv",
  "az",
  "he",
];

export function SettingsGeneral() {
  const { value, handle } = useUpdateGeneral();
  const [languagePopoverOpen, setLanguagePopoverOpen] = useState(false);

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* App Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">App</h2>
        <div className="space-y-6">
          <SettingRow
            title="Start Hyprnote automatically at login"
            description="Hyprnote will always be ready for action without you having to turn it on"
            checked={value.autostart ?? false}
            onChange={(checked) => handle.setField("autostart", checked)}
          />
          <SettingRow
            title="Start/Stop listening to meetings automatically"
            description="You don't have to press button every time — we'll start/stop listening for you"
            checked={value.notification_detect ?? false}
            onChange={(checked) => handle.setField("notification_detect", checked)}
          />
          <SettingRow
            title="Save recordings"
            description="Audio files of meetings will be saved locally and won't be leaving your device"
            checked={value.save_recordings ?? false}
            onChange={(checked) => handle.setField("save_recordings", checked)}
          />
          <SettingRow
            title="Share usage data"
            description="Help us improve Hyprnote by sharing anonymous metadata like button clicks"
            checked={value.telemetry_consent ?? false}
            onChange={(checked) => handle.setField("telemetry_consent", checked)}
          />
        </div>
      </div>

      {/* Language & Vocabulary Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Language & Vocabulary</h2>
        <div className="space-y-6">
          {/* Main Language */}
          <div className="flex flex-row items-center justify-between">
            <div>
              <h3 className="text-base font-medium mb-1">Main language</h3>
              <p className="text-sm text-neutral-600">Language for summaries, chats, and AI-generated responses</p>
            </div>
            <Select
              value={value.ai_language ?? "English"}
              onValueChange={(val) => handle.setField("ai_language", val)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[250px] overflow-auto">
                {SUPPORTED_LANGUAGES.map((langCode) => (
                  <SelectItem key={langCode} value={LANGUAGES_ISO_639_1[langCode].name}>
                    {LANGUAGES_ISO_639_1[langCode].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Spoken Languages */}
          <div>
            <h3 className="text-base font-medium mb-1">Spoken languages</h3>
            <p className="text-sm text-neutral-600 mb-3">Add other languages you use other than the main language</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex flex-wrap gap-2 min-h-[38px] p-2 border rounded-lg">
                {(value.spoken_languages ?? []).map((lang) => (
                  <Badge
                    key={lang}
                    variant="secondary"
                    className="flex items-center gap-1 px-2 py-0.5 text-xs bg-muted"
                  >
                    {lang}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-3 w-3 p-0 hover:bg-transparent ml-0.5"
                      onClick={() => {
                        const updated = (value.spoken_languages ?? []).filter(l => l !== lang);
                        handle.setField("spoken_languages", updated);
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <Popover open={languagePopoverOpen} onOpenChange={setLanguagePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-[38px] w-[38px]"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Search languages..." className="h-9" />
                    <CommandEmpty>No language found.</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-auto">
                      {SUPPORTED_LANGUAGES.filter(
                        (langCode) => !(value.spoken_languages ?? []).includes(LANGUAGES_ISO_639_1[langCode].name),
                      ).map((langCode) => (
                        <CommandItem
                          key={langCode}
                          onSelect={() => {
                            const langName = LANGUAGES_ISO_639_1[langCode].name;
                            handle.setField("spoken_languages", [...(value.spoken_languages ?? []), langName]);
                            setLanguagePopoverOpen(false);
                          }}
                        >
                          {LANGUAGES_ISO_639_1[langCode].name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Custom Vocabulary */}
          <div>
            <h3 className="text-base font-medium mb-1">Custom vocabulary</h3>
            <p className="text-sm text-neutral-600 mb-3">
              Add jargons or industry/company-specific terms to improve transcription accuracy
            </p>
            <Textarea
              value={(value.jargons ?? []).join(", ")}
              onChange={(e) => handle.setField("jargons", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
              onBlur={() => {
                // Auto-save on blur
              }}
              placeholder="smart notepad, offline, X, Discord"
              className="w-full resize-none"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Permissions Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Permissions</h2>
        <div className="space-y-4">
          {/* Microphone Access - Granted */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base font-medium mb-1">Microphone access</h3>
              <p className="text-sm text-neutral-600">Thanks for granting permission for system audio</p>
            </div>
            <div className="px-4 py-2 border rounded-lg bg-neutral-50 flex items-center gap-2">
              <Check className="w-4 h-4 text-neutral-600" />
              <span className="text-sm text-neutral-600">Access Granted</span>
            </div>
          </div>

          {/* System Audio Access - Not Granted */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="text-base font-medium text-red-500">System audio access</h3>
              </div>
              <p className="text-sm text-red-500">Oops! You need to grant access to use Hyprnote</p>
            </div>
            <Button className="bg-black hover:bg-neutral-800 text-white flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Grant Permission
            </Button>
          </div>
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
