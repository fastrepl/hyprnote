import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";

import { getLanguageDisplayName } from "../../../utils/language";

export function MainLanguageView({
  value,
  onChange,
  supportedLanguages,
}: {
  value: string;
  onChange: (value: string) => void;
  supportedLanguages: readonly string[];
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
              {getLanguageDisplayName(code)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
