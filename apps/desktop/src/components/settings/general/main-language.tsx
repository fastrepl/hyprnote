import { LANGUAGES_ISO_639_1 } from "@huggingface/languages";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";

type ISO_639_1_CODE = keyof typeof LANGUAGES_ISO_639_1;

interface MainLanguageViewProps {
  value: string;
  onChange: (value: string) => void;
  supportedLanguages: ISO_639_1_CODE[];
}

export function MainLanguageView({ value, onChange, supportedLanguages }: MainLanguageViewProps) {
  return (
    <div className="flex flex-row items-center justify-between">
      <div>
        <h3 className="text-sm font-medium mb-1">Main language</h3>
        <p className="text-xs text-neutral-600">Language for summaries, chats, and AI-generated responses</p>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-40 shadow-none focus:ring-0 focus:ring-offset-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[250px] overflow-auto">
          {supportedLanguages.map((langCode) => (
            <SelectItem key={langCode} value={LANGUAGES_ISO_639_1[langCode].name}>
              {LANGUAGES_ISO_639_1[langCode].name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
