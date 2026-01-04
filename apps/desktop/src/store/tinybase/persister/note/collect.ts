import { sep } from "@tauri-apps/api/path";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type { ParsedDocument } from "@hypr/plugin-frontmatter";
import type { EnhancedNoteStorage } from "@hypr/store";
import { isValidTiptapContent, json2md } from "@hypr/tiptap/shared";

import {
  type CollectorResult,
  getSessionDir,
  iterateTableRows,
  sanitizeFilename,
  type TablesContent,
} from "../utils";

export type NoteFrontmatter = {
  id: string;
  session_id: string;
  type: "enhanced_note" | "memo";
  template_id?: string;
  position?: number;
  title?: string;
};

function tryParseAndConvertToMarkdown(content: string): string | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return undefined;
  }

  if (!isValidTiptapContent(parsed)) {
    return undefined;
  }

  return json2md(parsed);
}

function getEnhancedNoteFilename<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  enhancedNote: EnhancedNoteStorage & { id: string },
): string {
  if (enhancedNote.template_id) {
    // @ts-ignore
    const templateTitle = store.getCell(
      "templates",
      enhancedNote.template_id,
      "title",
    ) as string | undefined;
    const safeName = sanitizeFilename(
      templateTitle || enhancedNote.template_id,
    );
    return `${safeName}.md`;
  }
  return "_summary.md";
}

export function collectNoteWriteOps<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  tables: TablesContent,
  dataDir: string,
): CollectorResult {
  const dirs = new Set<string>();
  const frontmatterBatchItems: Array<[ParsedDocument, string]> = [];

  for (const enhancedNote of iterateTableRows(tables, "enhanced_notes")) {
    if (!enhancedNote.content || !enhancedNote.session_id) {
      continue;
    }

    const markdown = tryParseAndConvertToMarkdown(enhancedNote.content);
    if (!markdown) {
      continue;
    }

    const filename = getEnhancedNoteFilename(store, enhancedNote);

    const frontmatter: NoteFrontmatter = {
      id: enhancedNote.id,
      session_id: enhancedNote.session_id,
      type: "enhanced_note",
      template_id: enhancedNote.template_id || undefined,
      position: enhancedNote.position,
      title: enhancedNote.title || undefined,
    };

    const session = tables.sessions?.[enhancedNote.session_id];
    const folderPath = session?.folder_id ?? "";
    const sessionDir = getSessionDir(
      dataDir,
      enhancedNote.session_id,
      folderPath,
    );
    dirs.add(sessionDir);
    frontmatterBatchItems.push([
      { frontmatter, content: markdown },
      [sessionDir, filename].join(sep()),
    ]);
  }

  for (const session of iterateTableRows(tables, "sessions")) {
    if (!session.raw_md) {
      continue;
    }

    const markdown = tryParseAndConvertToMarkdown(session.raw_md);
    if (!markdown) {
      continue;
    }

    const frontmatter: NoteFrontmatter = {
      id: session.id,
      session_id: session.id,
      type: "memo",
    };

    const folderPath = session.folder_id ?? "";
    const sessionDir = getSessionDir(dataDir, session.id, folderPath);
    dirs.add(sessionDir);
    frontmatterBatchItems.push([
      { frontmatter, content: markdown },
      [sessionDir, "_memo.md"].join(sep()),
    ]);
  }

  const operations: CollectorResult["operations"] = [];
  if (frontmatterBatchItems.length > 0) {
    operations.push({
      type: "frontmatter-batch",
      items: frontmatterBatchItems,
    });
  }

  return { dirs, operations };
}
