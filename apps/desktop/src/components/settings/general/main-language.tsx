import { useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hypr/ui/components/ui/select";

import {
  getBaseLanguageDisplayName,
  parseLocale,
} from "../../../utils/language";

export function MainLanguageView({
  value,
  onChange,
  supportedLanguages,
}: {
  value: string;
  onChange: (value: string) => void;
  supportedLanguages: readonly string[];
}) {
  const deduped = useMemo(() => {
    const map = new Map<string, string>();
    for (const code of supportedLanguages) {
      const { language } = parseLocale(code);
      if (!map.has(language)) {
        map.set(language, code);
      }
    }
    return map;
  }, [supportedLanguages]);

  const normalizedValue = useMemo(() => {
    const { language } = parseLocale(value);
    return deduped.get(language) ?? value;
  }, [value, deduped]);

  return (
    <div className="flex flex-row items-center justify-between">
      <div>
        <h3 className="text-sm font-medium mb-1">Main language</h3>
        <p className="text-xs text-neutral-600">
          Language for summaries, chats, and AI-generated responses
        </p>
      </div>
      <Select value={normalizedValue} onValueChange={onChange}>
        <SelectTrigger className="w-40 shadow-none focus:ring-0 focus:ring-offset-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[250px] overflow-auto">
          {[...deduped.values()].map((code) => (
            <SelectItem key={code} value={code}>
              {getBaseLanguageDisplayName(code)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
