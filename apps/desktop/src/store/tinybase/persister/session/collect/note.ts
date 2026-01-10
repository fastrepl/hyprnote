import { sep } from "@tauri-apps/api/path";

import type { ParsedDocument } from "@hypr/plugin-fs-sync";
import { isValidTiptapContent, json2md } from "@hypr/tiptap/shared";

import type { Store } from "../../../store/main";
import {
  buildSessionPath,
  type CollectorResult,
  iterateTableRows,
  sanitizeFilename,
  type TablesContent,
} from "../../shared";
import type { NoteFrontmatter } from "../types";

export type NoteCollectorResult = CollectorResult & {
  validNoteIds: Set<string>;
  sessionsWithMemo: Set<string>;
};

function tryParseAndConvertToMarkdown(content: string): string | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return content.trim() || undefined;
  }

  if (!isValidTiptapContent(parsed)) {
    return undefined;
  }

  return json2md(parsed);
}

function getEnhancedNoteFilename(
  store: Store,
  enhancedNote: ReturnType<typeof iterateTableRows<"enhanced_notes">>[number],
): string {
  if (enhancedNote.template_id) {
    const templateTitle = store.getCell(
      "templates",
      enhancedNote.template_id,
      "title",
    );
    const safeName = sanitizeFilename(
      templateTitle || enhancedNote.template_id,
    );
    return `${safeName}.md`;
  }
  return "_summary.md";
}

export function collectNoteWriteOps(
  store: Store,
  tables: TablesContent,
  dataDir: string,
  changedSessionIds?: Set<string>,
): NoteCollectorResult {
  const frontmatterBatchItems: Array<[ParsedDocument, string]> = [];
  const validNoteIds = new Set<string>();
  const sessionsWithMemo = new Set<string>();

  for (const enhancedNote of iterateTableRows(tables, "enhanced_notes")) {
    if (!enhancedNote.content || !enhancedNote.session_id) {
      continue;
    }

    validNoteIds.add(enhancedNote.id);

    if (changedSessionIds && !changedSessionIds.has(enhancedNote.session_id)) {
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
    const sessionDir = buildSessionPath(
      dataDir,
      enhancedNote.session_id,
      folderPath,
    );
    frontmatterBatchItems.push([
      { frontmatter, content: markdown },
      [sessionDir, filename].join(sep()),
    ]);
  }

  for (const session of iterateTableRows(tables, "sessions")) {
    if (!session.raw_md) {
      continue;
    }

    sessionsWithMemo.add(session.id);

    if (changedSessionIds && !changedSessionIds.has(session.id)) {
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
    const sessionDir = buildSessionPath(dataDir, session.id, folderPath);
    frontmatterBatchItems.push([
      { frontmatter, content: markdown },
      [sessionDir, "_memo.md"].join(sep()),
    ]);
  }

  const operations: CollectorResult["operations"] = [];
  if (frontmatterBatchItems.length > 0) {
    operations.push({
      type: "document-batch",
      items: frontmatterBatchItems,
    });
  }

  return { operations, validNoteIds, sessionsWithMemo };
}
