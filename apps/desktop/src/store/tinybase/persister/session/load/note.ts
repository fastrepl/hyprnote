import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import { md2json } from "@hypr/tiptap/shared";

import type { NoteFrontmatter } from "../types";
import type { LoadedSessionData } from "./types";

const LABEL = "SessionPersister";

export async function processMdFile(
  path: string,
  content: string,
  result: LoadedSessionData,
): Promise<void> {
  try {
    const parseResult = await fsSyncCommands.deserialize(content);

    if (parseResult.status === "error") {
      console.error(
        `[${LABEL}] Failed to parse frontmatter from ${path}:`,
        parseResult.error,
      );
      return;
    }

    const { frontmatter, content: markdownBody } = parseResult.data;
    const fm = frontmatter as NoteFrontmatter;

    if (!fm.id || !fm.session_id || !fm.type) {
      return;
    }

    const tiptapJson = md2json(markdownBody);
    const tiptapContent = JSON.stringify(tiptapJson);

    if (fm.type === "memo") {
      if (result.sessions[fm.session_id]) {
        result.sessions[fm.session_id].raw_md = tiptapContent;
      }
    } else if (fm.type === "enhanced_note") {
      result.enhanced_notes[fm.id] = {
        user_id: "",
        created_at: new Date().toISOString(),
        session_id: fm.session_id,
        content: tiptapContent,
        template_id: fm.template_id ?? "",
        position: fm.position ?? 0,
        title: fm.title ?? "",
      };
    }
  } catch (error) {
    console.error(`[${LABEL}] Failed to load note from ${path}:`, error);
  }
}
