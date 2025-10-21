import { LANGUAGES_ISO_639_1 } from "@huggingface/languages";
import { useForm } from "@tanstack/react-form";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";
import { cn } from "@hypr/utils";

import * as internal from "../../../store/tinybase/internal";
import { SettingRow } from "../shared";
import { Permissions } from "./permissions";

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
  const _value = internal.UI.useValues(internal.STORE_ID);
  const value = internal.generalSchema.parse(_value);

  const setPartialValues = internal.UI.useSetPartialValuesCallback(
    (row: Partial<internal.General>) => ({
      ...row,
      spoken_languages: row.spoken_languages ? JSON.stringify(row.spoken_languages) : undefined,
      jargons: row.jargons ? JSON.stringify(row.jargons) : undefined,
    } satisfies Partial<internal.GeneralStorage>),
    [],
    internal.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      autostart: value.autostart ?? false,
      notification_detect: value.notification_detect ?? false,
      save_recordings: value.save_recordings ?? false,
      telemetry_consent: value.telemetry_consent ?? false,
      ai_language: value.ai_language ?? "English",
      spoken_languages: value.spoken_languages ?? [],
      jargons: value.jargons ?? [],
    },
    listeners: {
      onChange: ({ formApi }) => {
        const { form: { errors } } = formApi.getAllErrors();
        if (errors.length > 0) {
          console.log(errors);
        }
        formApi.handleSubmit();
      },
    },
    onSubmit: ({ value }) => {
      setPartialValues(value);
    },
  });

  const [languageSearchQuery, setLanguageSearchQuery] = useState("");
  const [languageInputFocused, setLanguageInputFocused] = useState(false);
  const [languageSelectedIndex, setLanguageSelectedIndex] = useState(-1);
  const [vocabSearchQuery, setVocabSearchQuery] = useState("");
  const [vocabInputFocused, setVocabInputFocused] = useState(false);

  const getSpokenLanguages = () => form.getFieldValue("spoken_languages") as string[];
  const getJargons = () => form.getFieldValue("jargons") as string[];

  const filteredLanguages = useMemo(() => {
    if (!languageSearchQuery.trim()) {
      return [];
    }
    const query = languageSearchQuery.toLowerCase();
    const currentLanguages = getSpokenLanguages();
    return SUPPORTED_LANGUAGES
      .filter((langCode) => {
        const langName = LANGUAGES_ISO_639_1[langCode].name;
        return !((currentLanguages ?? []).includes(langName))
          && langName.toLowerCase().includes(query);
      })
      .map((langCode) => LANGUAGES_ISO_639_1[langCode].name);
  }, [languageSearchQuery]);

  const handleLanguageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const spokenLanguages = getSpokenLanguages();
    if (e.key === "Backspace" && !languageSearchQuery && (spokenLanguages ?? []).length > 0) {
      e.preventDefault();
      const languages = spokenLanguages ?? [];
      form.setFieldValue("spoken_languages", languages.slice(0, -1));
      return;
    }

    if (!languageSearchQuery.trim() || filteredLanguages.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setLanguageSelectedIndex((prev) => (prev < filteredLanguages.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setLanguageSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (languageSelectedIndex >= 0 && languageSelectedIndex < filteredLanguages.length) {
        form.setFieldValue("spoken_languages", [
          ...(spokenLanguages ?? []),
          filteredLanguages[languageSelectedIndex],
        ]);
        setLanguageSearchQuery("");
        setLanguageSelectedIndex(-1);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setLanguageInputFocused(false);
      setLanguageSearchQuery("");
    }
  };

  const handleVocabChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setVocabSearchQuery(inputValue);

    if (inputValue.includes(",")) {
      const terms = inputValue.split(",").map(s => s.trim()).filter(Boolean);
      if (terms.length > 0) {
        const jargons = getJargons();
        const existingJargons = new Set(jargons ?? []);
        const newTerms = terms.filter(term => !existingJargons.has(term));
        if (newTerms.length > 0) {
          form.setFieldValue("jargons", [...(jargons ?? []), ...newTerms]);
        }
        setVocabSearchQuery("");
      }
    }
  };

  const handleVocabKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const jargons = getJargons();
    if (e.key === "Backspace" && !vocabSearchQuery && (jargons ?? []).length > 0) {
      e.preventDefault();
      const currentJargons = jargons ?? [];
      form.setFieldValue("jargons", currentJargons.slice(0, -1));
      return;
    }

    if (e.key === "Enter" && vocabSearchQuery.trim()) {
      e.preventDefault();
      const newVocab = vocabSearchQuery.trim();
      if (!((jargons ?? []).includes(newVocab))) {
        form.setFieldValue("jargons", [...(jargons ?? []), newVocab]);
      }
      setVocabSearchQuery("");
    } else if (e.key === "Escape") {
      e.preventDefault();
      setVocabInputFocused(false);
      setVocabSearchQuery("");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-semibold mb-4">App</h2>
        <div className="space-y-6">
          <form.Field name="autostart">
            {(field) => (
              <SettingRow
                title="Start Hyprnote automatically at login"
                description="Hyprnote will always be ready for action without you having to turn it on"
                checked={field.state.value}
                onChange={(checked) => field.handleChange(checked)}
              />
            )}
          </form.Field>
          <form.Field name="notification_detect">
            {(field) => (
              <SettingRow
                title="Start/Stop listening to meetings automatically"
                description="You don't have to press button every time — we'll start/stop listening for you"
                checked={field.state.value}
                onChange={(checked) => field.handleChange(checked)}
              />
            )}
          </form.Field>
          <form.Field name="save_recordings">
            {(field) => (
              <SettingRow
                title="Save recordings"
                description="Audio files of meetings will be saved locally and won't be leaving your device"
                checked={field.state.value}
                onChange={(checked) => field.handleChange(checked)}
              />
            )}
          </form.Field>
          <form.Field name="telemetry_consent">
            {(field) => (
              <SettingRow
                title="Share usage data"
                description="Help us improve Hyprnote by sharing anonymous metadata like button clicks"
                checked={field.state.value}
                onChange={(checked) => field.handleChange(checked)}
              />
            )}
          </form.Field>
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-4">Language & Vocabulary</h2>
        <div className="space-y-6">
          <form.Field name="ai_language">
            {(field) => (
              <div className="flex flex-row items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium mb-1">Main language</h3>
                  <p className="text-xs text-neutral-600">Language for summaries, chats, and AI-generated responses</p>
                </div>
                <Select
                  value={field.state.value}
                  onValueChange={(val) => field.handleChange(val)}
                >
                  <SelectTrigger className="w-40 shadow-none focus:ring-0 focus:ring-offset-0">
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
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.spoken_languages}>
            {(spokenLanguages) => (
              <div>
                <h3 className="text-sm font-medium mb-1">Spoken languages</h3>
                <p className="text-xs text-neutral-600 mb-3">
                  Add other languages you use other than the main language
                </p>
                <div className="relative">
                  <div
                    className={cn(
                      [
                        "flex flex-wrap items-center w-full px-2 py-1.5 gap-1.5 rounded-lg bg-white border border-neutral-200 focus-within:border-neutral-300 min-h-[38px]",
                        languageInputFocused && "border-neutral-300",
                      ],
                    )}
                    onClick={() => document.getElementById("language-search-input")?.focus()}
                  >
                    {(spokenLanguages ?? []).map((lang: string) => (
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
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = (spokenLanguages ?? []).filter((l: string) => l !== lang);
                            form.setFieldValue("spoken_languages", updated);
                          }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </Badge>
                    ))}
                    {(spokenLanguages ?? []).length === 0 && (
                      <Search className="size-4 text-neutral-700 flex-shrink-0" />
                    )}
                    <input
                      id="language-search-input"
                      type="text"
                      value={languageSearchQuery}
                      onChange={(e) => {
                        setLanguageSearchQuery(e.target.value);
                        setLanguageSelectedIndex(-1);
                      }}
                      onKeyDown={handleLanguageKeyDown}
                      onFocus={() => setLanguageInputFocused(true)}
                      onBlur={() => setLanguageInputFocused(false)}
                      role="combobox"
                      aria-haspopup="listbox"
                      aria-expanded={languageInputFocused && !!languageSearchQuery.trim()}
                      aria-controls="language-options"
                      aria-activedescendant={languageSelectedIndex >= 0
                        ? `language-option-${languageSelectedIndex}`
                        : undefined}
                      aria-label="Add spoken language"
                      placeholder={(spokenLanguages ?? []).length === 0 ? "Add language" : ""}
                      className="flex-1 min-w-[120px] bg-transparent text-sm focus:outline-none placeholder:text-neutral-500"
                    />
                  </div>

                  {languageInputFocused && languageSearchQuery.trim() && (
                    <div
                      id="language-options"
                      role="listbox"
                      className="absolute top-full left-0 right-0 mt-1 flex flex-col w-full rounded border border-neutral-200 overflow-hidden bg-white shadow-md z-10 max-h-60 overflow-y-auto"
                    >
                      {filteredLanguages.length > 0
                        ? (
                          filteredLanguages.map((langName, index) => (
                            <button
                              key={langName}
                              id={`language-option-${index}`}
                              type="button"
                              role="option"
                              aria-selected={languageSelectedIndex === index}
                              onClick={() => {
                                form.setFieldValue("spoken_languages", [...(spokenLanguages ?? []), langName]);
                                setLanguageSearchQuery("");
                                setLanguageSelectedIndex(-1);
                              }}
                              onMouseDown={(e) => e.preventDefault()}
                              onMouseEnter={() => setLanguageSelectedIndex(index)}
                              className={cn([
                                "flex items-center justify-between px-3 py-2 text-sm text-left transition-colors w-full",
                                languageSelectedIndex === index ? "bg-neutral-200" : "hover:bg-neutral-100",
                              ])}
                            >
                              <span className="font-medium truncate">{langName}</span>
                            </button>
                          ))
                        )
                        : (
                          <div className="px-3 py-2 text-sm text-neutral-500 text-center">
                            No matching languages found
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </form.Subscribe>

          <form.Subscribe selector={(state) => state.values.jargons}>
            {(jargons) => (
              <div>
                <h3 className="text-sm font-medium mb-1">Custom vocabulary</h3>
                <p className="text-xs text-neutral-600 mb-3">
                  Add jargons or industry/company-specific terms to improve transcription accuracy
                </p>
                <div className="relative">
                  <div
                    className={cn([
                      "flex flex-wrap items-center w-full px-2 py-1.5 gap-1.5 rounded-lg bg-white border border-neutral-200 focus-within:border-neutral-300 min-h-[38px]",
                      vocabInputFocused && "border-neutral-300",
                    ])}
                    onClick={() => document.getElementById("vocab-search-input")?.focus()}
                  >
                    {(jargons ?? []).map((vocab: string) => (
                      <Badge
                        key={vocab}
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-0.5 text-xs bg-muted"
                      >
                        {vocab}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-3 w-3 p-0 hover:bg-transparent ml-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = (jargons ?? []).filter((j: string) => j !== vocab);
                            form.setFieldValue("jargons", updated);
                          }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </Badge>
                    ))}
                    {(jargons ?? []).length === 0 && <Search className="size-4 text-neutral-700 flex-shrink-0" />}
                    <input
                      id="vocab-search-input"
                      type="text"
                      value={vocabSearchQuery}
                      onChange={handleVocabChange}
                      onKeyDown={handleVocabKeyDown}
                      onFocus={() => setVocabInputFocused(true)}
                      onBlur={() => setVocabInputFocused(false)}
                      role="textbox"
                      aria-label="Add custom vocabulary"
                      placeholder={(jargons ?? []).length === 0 ? "Add terms separated by comma" : ""}
                      className="flex-1 min-w-[120px] bg-transparent text-sm focus:outline-none placeholder:text-neutral-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </form.Subscribe>
        </div>
      </div>

      <Permissions />
    </div>
  );
}
