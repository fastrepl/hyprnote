import {
  LANGUAGES_ISO_639_1,
  LANGUAGES_ISO_639_3,
} from "@huggingface/languages";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";

type ISO_639_1_CODE = keyof typeof LANGUAGES_ISO_639_1;
type ISO_639_3_CODE = keyof typeof LANGUAGES_ISO_639_3;
type LANGUAGE_CODE = ISO_639_1_CODE | ISO_639_3_CODE;

function getLanguageName(code: string): string {
  if (code in LANGUAGES_ISO_639_1) {
    return LANGUAGES_ISO_639_1[code as ISO_639_1_CODE].name;
  }
  if (code in LANGUAGES_ISO_639_3) {
    return LANGUAGES_ISO_639_3[code as ISO_639_3_CODE].name;
  }
  return code;
}

export function MainLanguageView({
  value,
  onChange,
  supportedLanguages,
}: {
  value: string;
  onChange: (value: string) => void;
  supportedLanguages: LANGUAGE_CODE[];
}) {
  return (
    <div className="flex flex-row items-center justify-between">
      <div>
        <h3 className="text-sm font-medium mb-1">Main language</h3>
        <p className="text-xs text-neutral-600">
          Language for summaries, chats, and AI-generated responses
        </p>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-40 shadow-none focus:ring-0 focus:ring-offset-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[250px] overflow-auto">
          {supportedLanguages.map((code) => (
            <SelectItem key={code} value={code}>
              {getLanguageName(code)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
