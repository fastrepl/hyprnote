import { useMemo } from "react";
import { ara, deu, eng, fra, ita, jpn, kor, por, removeStopwords, rus, spa, zho } from "stopword";

import { useConfigValue } from "../config/use-config";
import * as main from "../store/tinybase/main";

export function useKeywords(sessionId: string) {
  const vocabsTable = main.UI.useResultTable(main.QUERIES.visibleVocabs, main.STORE_ID);
  const rawMd = main.UI.useCell("sessions", sessionId, "raw_md", main.STORE_ID);
  const languages = useConfigValue("spoken_languages") ?? ["en"];

  return useMemo(() => {
    const vocabs = extractVocabs(vocabsTable);
    const markdownWords = rawMd && typeof rawMd === "string"
      ? extractWordsFromMarkdown(rawMd, languages)
      : [];

    return combineKeywords(vocabs, markdownWords);
  }, [vocabsTable, rawMd, languages]);
}

const LANGUAGE_STOPWORD_MAP: Record<string, string[]> = {
  "en": eng,
  "zh": zho,
  "ja": jpn,
  "ko": kor,
  "es": spa,
  "fr": fra,
  "de": deu,
  "it": ita,
  "pt": por,
  "ru": rus,
  "ar": ara,
};

const getStopwordsForLanguages = (languages: string[] = ["en"]): string[] =>
  languages.flatMap((lang) => LANGUAGE_STOPWORD_MAP[lang] ?? []);

const removeCodeBlocks = (text: string): string => text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");

const extractHashtags = (text: string): string[] =>
  Array.from(text.matchAll(/#([\p{L}\p{N}_]+)/gu), (match) => match[1]).filter(Boolean);

const stripMarkdownFormatting = (text: string): string => text.replace(/[#*_~`\[\]()]/g, " ");

const extractWords = (text: string): string[] =>
  Array.from(text.matchAll(/\b[\p{L}\p{N}]{2,}\b/gu), (match) => match[0]).filter((word) => /\p{L}/u.test(word));

const extractWordsFromMarkdown = (markdown: string, languages: string[] = ["en"]): string[] => {
  const withoutCode = removeCodeBlocks(markdown);
  const hashtags = extractHashtags(withoutCode);
  const cleaned = stripMarkdownFormatting(withoutCode);
  const words = extractWords(cleaned);

  const stopwords = getStopwordsForLanguages(languages);
  const filtered = stopwords.length > 0 ? removeStopwords(words, stopwords) : words;

  return [...hashtags, ...filtered];
};

const extractVocabs = (vocabsTable: Record<string, { text?: unknown }>): string[] =>
  Object.values(vocabsTable)
    .map(({ text }) => (typeof text === "string" ? text.trim() : null))
    .filter((text): text is string => Boolean(text));

const combineKeywords = (vocabs: string[], markdownWords: string[]): string[] =>
  Array.from(new Set([...vocabs, ...markdownWords])).filter((keyword) => keyword.length >= 2);
