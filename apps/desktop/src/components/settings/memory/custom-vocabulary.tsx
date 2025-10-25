import { Search, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@hypr/ui/components/ui/badge";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

interface CustomVocabularyViewProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function CustomVocabularyView({ value, onChange }: CustomVocabularyViewProps) {
  const [vocabSearchQuery, setVocabSearchQuery] = useState("");
  const [vocabInputFocused, setVocabInputFocused] = useState(false);

  const handleVocabChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setVocabSearchQuery(inputValue);

    if (inputValue.includes(",")) {
      const terms = inputValue.split(",").map(s => s.trim()).filter(Boolean);
      if (terms.length > 0) {
        const existingJargons = new Set(value);
        const newTerms = terms.filter(term => !existingJargons.has(term));
        if (newTerms.length > 0) {
          onChange([...value, ...newTerms]);
        }
        setVocabSearchQuery("");
      }
    }
  };

  const handleVocabKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !vocabSearchQuery && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
      return;
    }

    if (e.key === "Enter" && vocabSearchQuery.trim()) {
      e.preventDefault();
      const newVocab = vocabSearchQuery.trim();
      if (!value.includes(newVocab)) {
        onChange([...value, newVocab]);
      }
      setVocabSearchQuery("");
    } else if (e.key === "Escape") {
      e.preventDefault();
      setVocabInputFocused(false);
      setVocabSearchQuery("");
    }
  };

  return (
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
          {value.map((vocab) => (
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
                  onChange(value.filter((j) => j !== vocab));
                }}
              >
                <X className="h-2.5 w-2.5" />
              </Button>
            </Badge>
          ))}
          {value.length === 0 && <Search className="size-4 text-neutral-700 flex-shrink-0" />}
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
            placeholder={value.length === 0 ? "Add terms separated by comma" : ""}
            className="flex-1 min-w-[120px] bg-transparent text-sm focus:outline-none placeholder:text-neutral-500"
          />
        </div>
      </div>
    </div>
  );
}
