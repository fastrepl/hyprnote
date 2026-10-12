import { loadFolderMaterials } from "~/session/folder-attachments";
import { loadFolderInstructions } from "~/session/folder-catalog";
import { loadSessionSummariesByFolder } from "~/session/queries";

const FOLDER_CONTEXT_SESSION_LIMIT = 50;

export async function renderFolderContext(
  folderId: string,
): Promise<string | null> {
  const sessions = await loadSessionSummariesByFolder(folderId);
  const materials = folderId ? await loadFolderMaterials(folderId) : [];
  const instructions = folderId ? await loadFolderInstructions(folderId) : "";
  const label = folderId || "No folder";
  const lines = [
    `Folder context: ${label} (${sessions.length} ${sessions.length === 1 ? "note" : "notes"})`,
    folderId
      ? "Answer from notes in this folder. Use get_meeting or search_meetings with the listed IDs when you need full notes or transcripts. Use list_meetings with this folder_path to enumerate every note. Use read_folder_material with a listed material ID to read a syllabus or other folder file."
      : "Answer from these unfiled notes. Use get_meeting or search_meetings with the listed IDs when you need full notes or transcripts.",
  ];

  if (instructions.trim()) {
    lines.push("");
    lines.push("Folder instructions:");
    lines.push(instructions.trim());
  }

  if (materials.length > 0) {
    lines.push("");
    lines.push("Folder materials:");
    for (const material of materials) {
      lines.push(`- ${material.filename} [${material.id}]`);
    }
  }

  if (sessions.length === 0) {
    lines.push("");
    lines.push("This folder has no notes yet.");
    return lines.join("\n");
  }

  const visible = sessions.slice(0, FOLDER_CONTEXT_SESSION_LIMIT);
  lines.push("");
  for (const session of visible) {
    const title = session.title.trim() || "Untitled";
    const date = session.created_at.trim();
    lines.push(`- ${title}${date ? ` (${date})` : ""} [${session.id}]`);
  }

  const hiddenCount = sessions.length - visible.length;
  if (hiddenCount > 0) {
    lines.push(
      folderId
        ? `- and ${hiddenCount} more (use list_meetings with folder_path "${folderId}" to enumerate every note)`
        : `- and ${hiddenCount} more`,
    );
  }

  return lines.join("\n");
}
