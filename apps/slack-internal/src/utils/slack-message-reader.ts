import type { WebClient } from "@slack/web-api";

export interface SlackMessageLink {
  channel: string;
  ts: string;
  threadTs?: string;
}

export interface FileInfo {
  id: string;
  name: string;
  mimetype: string;
  size: number;
  content?: string;
  base64?: string;
}

export interface CanvasInfo {
  id: string;
  content: string;
}

export interface ProcessedMessage {
  text: string;
  user?: string;
  ts: string;
  files: FileInfo[];
  canvases: CanvasInfo[];
  urls: string[];
}

export interface ThreadContent {
  parentMessage: ProcessedMessage;
  replies: ProcessedMessage[];
}

export function parseSlackMessageLinks(text: string): SlackMessageLink[] {
  const regex =
    /https:\/\/[^\/]+\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d{10})(\d{6})(?:\?thread_ts=(\d+\.\d+))?/g;
  const matches: SlackMessageLink[] = [];

  let match;
  while ((match = regex.exec(text)) !== null) {
    const ts = `${match[2]}.${match[3]}`;
    matches.push({
      channel: match[1],
      ts,
      threadTs: match[4],
    });
  }

  return matches;
}

export function extractUrlsFromText(text: string): string[] {
  const urlRegex = /<(https?:\/\/[^|>]+)(?:\|[^>]*)?>/g;
  const urls: string[] = [];

  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[1];
    if (!url.includes(".slack.com/archives/")) {
      urls.push(url);
    }
  }

  return urls;
}

function extractCanvasIds(text: string): string[] {
  const canvasRegex = /<https:\/\/[^\/]+\.slack\.com\/docs\/([A-Z0-9]+)[^>]*>/g;
  const ids: string[] = [];

  let match;
  while ((match = canvasRegex.exec(text)) !== null) {
    ids.push(match[1]);
  }

  return ids;
}

async function fetchFileContent(
  client: WebClient,
  fileId: string,
  token: string,
): Promise<FileInfo | null> {
  try {
    const result = await client.files.info({ file: fileId });
    const file = result.file;
    if (!file) return null;

    const fileInfo: FileInfo = {
      id: file.id!,
      name: file.name || "unknown",
      mimetype: file.mimetype || "unknown",
      size: file.size || 0,
    };

    const textMimetypes = [
      "text/plain",
      "text/markdown",
      "text/html",
      "text/csv",
      "application/json",
      "application/xml",
      "text/javascript",
      "text/typescript",
    ];

    if (
      file.mimetype &&
      textMimetypes.some((t) => file.mimetype!.includes(t))
    ) {
      if (file.url_private) {
        try {
          const response = await fetch(file.url_private, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            fileInfo.content = await response.text();
          }
        } catch {
          // Failed to fetch file content
        }
      }
    } else if (file.mimetype?.startsWith("image/")) {
      if (file.url_private) {
        try {
          const response = await fetch(file.url_private, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            fileInfo.base64 = Buffer.from(arrayBuffer).toString("base64");
          }
        } catch {
          // Failed to fetch image content
        }
      }
    }

    return fileInfo;
  } catch {
    return null;
  }
}

async function fetchCanvasContent(
  client: WebClient,
  canvasId: string,
): Promise<CanvasInfo | null> {
  try {
    const result = await client.canvases.sections.lookup({
      canvas_id: canvasId,
      criteria: { section_types: ["any_header"] },
    });

    if (!result.sections || result.sections.length === 0) {
      return null;
    }

    const content = (
      result.sections as Array<{ document_content?: { markdown?: string } }>
    )
      .map((section) => section.document_content?.markdown || "")
      .filter(Boolean)
      .join("\n\n");

    return { id: canvasId, content };
  } catch {
    return null;
  }
}

interface SlackMessage {
  text?: string;
  user?: string;
  ts?: string;
  files?: Array<{ id?: string }>;
  thread_ts?: string;
}

async function processMessage(
  client: WebClient,
  message: SlackMessage,
  token: string,
): Promise<ProcessedMessage> {
  const text = message.text || "";
  const urls = extractUrlsFromText(text);
  const canvasIds = extractCanvasIds(text);

  const files: FileInfo[] = [];
  if (message.files) {
    const fileResults = await Promise.all(
      message.files.map((f) =>
        f.id ? fetchFileContent(client, f.id, token) : null,
      ),
    );
    files.push(...fileResults.filter((f): f is FileInfo => f !== null));
  }

  const canvases: CanvasInfo[] = [];
  if (canvasIds.length > 0) {
    const canvasResults = await Promise.all(
      canvasIds.map((id) => fetchCanvasContent(client, id)),
    );
    canvases.push(...canvasResults.filter((c): c is CanvasInfo => c !== null));
  }

  return {
    text,
    user: message.user,
    ts: message.ts || "",
    files,
    canvases,
    urls,
  };
}

export async function fetchSlackThread(
  client: WebClient,
  channel: string,
  ts: string,
  token: string,
): Promise<ThreadContent | null> {
  try {
    const result = await client.conversations.replies({
      channel,
      ts,
      inclusive: true,
      limit: 100,
    });

    if (!result.messages || result.messages.length === 0) {
      return null;
    }

    const [parentRaw, ...repliesRaw] = result.messages;
    const parentMessage = await processMessage(
      client,
      parentRaw as SlackMessage,
      token,
    );
    const replies = await Promise.all(
      repliesRaw.map((m) => processMessage(client, m as SlackMessage, token)),
    );

    return { parentMessage, replies };
  } catch {
    return null;
  }
}

function formatFileInfo(file: FileInfo): string {
  if (file.content) {
    return `[File: ${file.name} (${file.mimetype})]\n${file.content}`;
  }
  if (file.base64) {
    return `[Image: ${file.name} - included as image attachment]`;
  }
  return `[File: ${file.name} (${file.mimetype}, ${file.size} bytes)]`;
}

function formatProcessedMessage(msg: ProcessedMessage, indent = ""): string {
  const parts: string[] = [];

  if (msg.text) {
    parts.push(`${indent}${msg.text}`);
  }

  if (msg.files.length > 0) {
    parts.push(`${indent}Files:`);
    for (const file of msg.files) {
      parts.push(`${indent}  ${formatFileInfo(file)}`);
    }
  }

  if (msg.canvases.length > 0) {
    for (const canvas of msg.canvases) {
      parts.push(`${indent}[Canvas]\n${canvas.content}`);
    }
  }

  if (msg.urls.length > 0) {
    parts.push(`${indent}URLs: ${msg.urls.join(", ")}`);
  }

  return parts.join("\n");
}

export function formatThreadContent(thread: ThreadContent): string {
  const parts: string[] = [];

  parts.push("=== Parent Message ===");
  parts.push(formatProcessedMessage(thread.parentMessage));

  if (thread.replies.length > 0) {
    parts.push("\n=== Thread Replies ===");
    for (let i = 0; i < thread.replies.length; i++) {
      parts.push(`\n--- Reply ${i + 1} ---`);
      parts.push(formatProcessedMessage(thread.replies[i]));
    }
  }

  return parts.join("\n");
}

export interface ImageAttachment {
  base64: string;
  mimeType: string;
  name: string;
}

export interface ReferencedContent {
  text: string;
  images: ImageAttachment[];
}

function extractImagesFromThread(thread: ThreadContent): ImageAttachment[] {
  const images: ImageAttachment[] = [];

  const processMessage = (msg: ProcessedMessage) => {
    for (const file of msg.files) {
      if (file.base64 && file.mimetype.startsWith("image/")) {
        images.push({
          base64: file.base64,
          mimeType: file.mimetype,
          name: file.name,
        });
      }
    }
  };

  processMessage(thread.parentMessage);
  for (const reply of thread.replies) {
    processMessage(reply);
  }

  return images;
}

export async function fetchReferencedSlackMessages(
  client: WebClient,
  text: string,
  token: string,
): Promise<ReferencedContent[]> {
  const links = parseSlackMessageLinks(text);
  const results: ReferencedContent[] = [];

  for (const link of links) {
    const threadTs = link.threadTs || link.ts;
    const thread = await fetchSlackThread(
      client,
      link.channel,
      threadTs,
      token,
    );
    if (thread) {
      results.push({
        text: formatThreadContent(thread),
        images: extractImagesFromThread(thread),
      });
    }
  }

  return results;
}
