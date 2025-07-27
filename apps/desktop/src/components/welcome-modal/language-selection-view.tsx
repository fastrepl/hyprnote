import { LANGUAGES_ISO_639_1 } from "@huggingface/languages";
import { Trans } from "@lingui/react/macro";
import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@hypr/ui/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import PushableButton from "@hypr/ui/components/ui/pushable-button";

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
];

interface LanguageSelectionViewProps {
  onContinue: (languages: string[]) => void;
}

export function LanguageSelectionView({ onContinue }: LanguageSelectionViewProps) {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["en"]);
  const [open, setOpen] = useState(false);

  const handleAddLanguage = (langCode: string) => {
    if (!selectedLanguages.includes(langCode)) {
      setSelectedLanguages([...selectedLanguages, langCode]);
    }
    setOpen(false);
  };

  const handleRemoveLanguage = (langCode: string) => {
    // Don't allow removing English or if it would leave us with no languages
    if (langCode === "en" || selectedLanguages.length <= 1) {
      return;
    }
    setSelectedLanguages(selectedLanguages.filter(l => l !== langCode));
  };

  const handleContinue = () => {
    onContinue(selectedLanguages);
  };

  return (
    <div className="flex flex-col items-center min-w-[30rem]">
      <h2 className="text-xl font-semibold mb-4">
        <Trans>Select Your Languages</Trans>
      </h2>

      <p className="text-center text-sm text-muted-foreground mb-8">
        <Trans>Choose the languages you speak for better transcription accuracy</Trans>
      </p>

      <div className="w-full max-w-[30rem] mb-8">
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 min-h-[38px]">
                {selectedLanguages.map((langCode) => (
                  <Badge
                    key={langCode}
                    variant="secondary"
                    className="flex items-center gap-1 px-2.5 py-1 text-sm bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200 transition-colors"
                  >
                    {LANGUAGES_ISO_639_1[langCode as ISO_639_1_CODE]?.name || langCode}
                    {selectedLanguages.length > 1 && langCode !== "en" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveLanguage(langCode);
                        }}
                        className="ml-0.5 hover:text-neutral-900 transition-colors"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
              {selectedLanguages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  <Trans>Select at least one language</Trans>
                </p>
              )}
            </div>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search languages..." className="h-9" />
                  <CommandEmpty>
                    <Trans>No language found.</Trans>
                  </CommandEmpty>
                  <CommandGroup className="max-h-[150px] overflow-auto">
                    {SUPPORTED_LANGUAGES.filter(
                      (lang) => !selectedLanguages.includes(lang),
                    ).map((lang) => {
                      const language = LANGUAGES_ISO_639_1[lang];
                      return (
                        <CommandItem
                          key={lang}
                          onSelect={() => handleAddLanguage(lang)}
                          className="flex items-center justify-between py-2"
                        >
                          <div>
                            <div className="text-sm">{language.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {language.nativeName}
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          <Trans>Add languages you use during meetings to improve transcription accuracy</Trans>
        </p>
      </div>

      <PushableButton
        onClick={handleContinue}
        className="w-full max-w-sm"
        disabled={selectedLanguages.length === 0}
      >
        <Trans>Continue</Trans>
      </PushableButton>
    </div>
  );
}
