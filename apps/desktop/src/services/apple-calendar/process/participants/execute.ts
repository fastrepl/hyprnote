import type {
  HumanStorage,
  MappingSessionParticipantStorage,
} from "@hypr/store";

import { id } from "../../../../utils";
import type { Ctx } from "../../ctx";
import type { ParticipantsSyncOutput } from "./types";

export function executeForParticipantsSync(
  ctx: Ctx,
  out: ParticipantsSyncOutput,
): void {
  const userId = ctx.store.getValue("user_id");
  if (!userId) {
    return;
  }

  const now = new Date().toISOString();

  ctx.store.transaction(() => {
    for (const human of out.humansToCreate) {
      ctx.store.setRow("humans", human.id, {
        user_id: String(userId),
        created_at: now,
        name: human.name,
        email: human.email,
        org_id: "",
        job_title: "",
        linkedin_username: "",
        is_user: false,
        memo: "",
      } satisfies HumanStorage);
    }

    for (const mappingId of out.toDelete) {
      ctx.store.delRow("mapping_session_participant", mappingId);
    }

    for (const mapping of out.toAdd) {
      ctx.store.setRow("mapping_session_participant", id(), {
        user_id: String(userId),
        created_at: now,
        session_id: mapping.sessionId,
        human_id: mapping.humanId,
        source: "auto",
      } satisfies MappingSessionParticipantStorage);
    }
  });
}
