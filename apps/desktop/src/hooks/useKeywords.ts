import { Effect, Option, pipe } from "effect";
import type { UnknownException } from "effect/Cause";
import { toString } from "nlcst-to-string";
import { useMemo } from "react";
import retextEnglish from "retext-english";
import type { Keyphrase, Keyword } from "retext-keywords";
import retextKeywords from "retext-keywords";
import retextPos from "retext-pos";
import retextStringify from "retext-stringify";
import { unified } from "unified";
import type { VFile } from "vfile";

import * as main from "../store/tinybase/main";

export function useKeywords(sessionId: string) {
  const vocabsTable = main.UI.useResultTable(
    main.QUERIES.visibleVocabs,
    main.STORE_ID,
  );
  const rawMd = main.UI.useCell("sessions", sessionId, "raw_md", main.STORE_ID);

  return useMemo(() => {
    const vocabs = extractVocabs(vocabsTable);
    const { keywords, keyphrases } =
      rawMd && typeof rawMd === "string"
        ? extractKeywordsFromMarkdown(rawMd)
        : { keywords: [], keyphrases: [] };

    return combineKeywords(vocabs, [...keywords, ...keyphrases]);
  }, [vocabsTable, rawMd]);
}

export const extractKeywordsFromMarkdown = (
  markdown: string,
): { keywords: string[]; keyphrases: string[] } =>
  pipe(
    Effect.succeed(markdown),
    Effect.map(removeCodeBlocks),
    Effect.map((text) => ({
      hashtags: extractHashtags(text),
      cleaned: stripMarkdownFormatting(text),
    })),
    Effect.flatMap(({ cleaned, hashtags }) =>
      cleaned.trim().length === 0
        ? Effect.succeed({ keywords: hashtags, keyphrases: [] })
        : pipe(
            processMarkdown(cleaned),
            Effect.map((file) => gatherKeywords(file, hashtags)),
            Effect.orElse(() =>
              Effect.succeed({ keywords: hashtags, keyphrases: [] }),
            ),
          ),
    ),
    Effect.runSync,
  );

const processMarkdown = (
  markdown: string,
): Effect.Effect<VFile, UnknownException, never> =>
  Effect.try(() =>
    unified()
      .use(retextEnglish)
      .use(retextPos)
      .use(retextKeywords, { maximum: 50 })
      .use(retextStringify)
      .processSync(markdown),
  );

const gatherKeywords = (
  file: VFile,
  hashtags: string[],
): { keywords: string[]; keyphrases: string[] } => {
  const keywords = pipe(
    Option.fromNullable(file.data.keywords),
    Option.map((entries) => entries.flatMap(extractKeywordMatches)),
    Option.getOrElse(() => [] as string[]),
  );

  const keyphrases = pipe(
    Option.fromNullable(file.data.keyphrases),
    Option.map((entries) => entries.flatMap(extractKeyphraseMatches)),
    Option.getOrElse(() => [] as string[]),
  );

  return {
    keywords: [...hashtags, ...keywords].filter(
      (keyword) => keyword.length >= 2,
    ),
    keyphrases: keyphrases.filter((phrase) => phrase.length >= 2),
  };
};

const extractKeywordMatches = (keyword: Keyword): string[] =>
  keyword.matches.flatMap((match) => {
    const text = toString(match.node).trim();
    return text.length > 0 ? [text] : [];
  });

const extractKeyphraseMatches = (phrase: Keyphrase): string[] =>
  phrase.matches.flatMap((match) => {
    const text = toString(match.nodes).trim();
    return text.length > 0 ? [text] : [];
  });

const extractVocabs = (
  vocabsTable: Record<string, { text?: unknown }>,
): string[] =>
  Object.values(vocabsTable).flatMap(({ text }) =>
    pipe(
      Option.fromNullable(text),
      Option.filter((t): t is string => typeof t === "string"),
      Option.map((t) => t.trim()),
      Option.filter((t) => t.length > 0),
      Option.match({
        onNone: () => [],
        onSome: (t) => [t],
      }),
    ),
  );

const combineKeywords = (vocabs: string[], markdownWords: string[]): string[] =>
  Array.from(new Set([...vocabs, ...markdownWords])).filter(
    (keyword) => keyword.length >= 2,
  );

const removeCodeBlocks = (text: string): string =>
  text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");

const extractHashtags = (text: string): string[] =>
  Array.from(text.matchAll(/#([\p{L}\p{N}_]+)/gu), (match) => match[1]).filter(
    Boolean,
  );

const stripMarkdownFormatting = (text: string): string =>
  text.replace(/[#*_~`\[\]()]/g, " ");
