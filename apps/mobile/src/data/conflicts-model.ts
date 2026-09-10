// Pure mapping for conflict copies and note version history. No React Native
// imports so the node test can load this file directly.

export type SessionConflictRow = {
  id: string;
  row_id: string;
  table_name: string;
  field_name: string;
  lost_side: string;
  edited_at_ms: number | null;
  value_json: string;
  created_at: string;
};

export type SessionConflict = {
  id: string;
  sessionId: string;
  field: "body" | "title";
  lostSide: "local" | "remote";
  at: string;
  value: string;
  bodyFormat: "prosemirror_json" | "markdown";
};

export type SessionVersionRow = {
  id: string;
  body: string;
  body_format: string;
  source: string;
  created_at: string;
};

export type VersionHistoryEntry = {
  id: string;
  label: string;
  at: string;
  preview: string;
  body: string;
  bodyFormat: "prosemirror_json" | "markdown";
  conflictId: string | null;
};

const PREVIEW_LENGTH = 120;

type DocNode = { type?: string; content?: DocNode[]; text?: string };

function parseDoc(body: string): DocNode | null {
  if (body.trim() === "") return null;
  try {
    const parsed: unknown = JSON.parse(body);
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as DocNode).type === "doc" &&
      Array.isArray((parsed as DocNode).content)
    ) {
      return parsed as DocNode;
    }
  } catch {}
  return null;
}

// Text nodes inside one block run together; separate blocks get a space so a
// preview of a list or several paragraphs stays readable.
function nodeText(node: DocNode): string {
  if (typeof node.text === "string") return node.text;
  if (!Array.isArray(node.content)) return "";
  const inline = node.content.every((child) => typeof child.text === "string");
  return node.content.map(nodeText).join(inline ? "" : " ");
}

export function bodyFormatFromBody(
  body: string,
): "prosemirror_json" | "markdown" {
  return parseDoc(body) ? "prosemirror_json" : "markdown";
}

export function previewFromBody(body: string, bodyFormat: string): string {
  const doc = bodyFormat === "markdown" ? null : parseDoc(body);
  const text = doc ? nodeText(doc) : body.replace(/^#{1,6}[ \t]+/gm, "");
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length <= PREVIEW_LENGTH
    ? collapsed
    : `${collapsed.slice(0, PREVIEW_LENGTH).trimEnd()}…`;
}

function decodeValue(valueJson: string): string | null {
  try {
    const parsed: unknown = JSON.parse(valueJson);
    return typeof parsed === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function conflictTime(editedAtMs: number | null, createdAt: string): string {
  if (typeof editedAtMs === "number" && Number.isFinite(editedAtMs)) {
    const edited = new Date(editedAtMs);
    if (!Number.isNaN(edited.getTime())) return edited.toISOString();
  }
  return createdAt;
}

export function mapConflictRows(rows: SessionConflictRow[]): SessionConflict[] {
  const conflicts: SessionConflict[] = [];
  for (const row of rows) {
    const value = decodeValue(row.value_json);
    if (value === null) continue;
    if (row.field_name !== "body" && row.field_name !== "title") continue;
    conflicts.push({
      id: row.id,
      sessionId: row.row_id,
      field: row.field_name,
      lostSide: row.lost_side === "local" ? "local" : "remote",
      at: conflictTime(row.edited_at_ms, row.created_at),
      value,
      bodyFormat: bodyFormatFromBody(value),
    });
  }
  return conflicts;
}

function timestamp(iso: string): number {
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function buildVersionHistory(
  conflicts: SessionConflict[],
  versions: SessionVersionRow[],
): VersionHistoryEntry[] {
  const entries: VersionHistoryEntry[] = [];
  for (const conflict of conflicts) {
    if (conflict.field !== "body") continue;
    entries.push({
      id: conflict.id,
      label: "Other device",
      at: conflict.at,
      preview: previewFromBody(conflict.value, conflict.bodyFormat),
      body: conflict.value,
      bodyFormat: conflict.bodyFormat,
      conflictId: conflict.id,
    });
  }
  for (const version of versions) {
    const bodyFormat =
      version.body_format === "markdown"
        ? "markdown"
        : bodyFormatFromBody(version.body);
    entries.push({
      id: version.id,
      label: version.source === "sync" ? "Synced" : "This device",
      at: version.created_at,
      preview: previewFromBody(version.body, bodyFormat),
      body: version.body,
      bodyFormat,
      conflictId: null,
    });
  }
  return entries.sort(
    (left, right) => timestamp(right.at) - timestamp(left.at),
  );
}
