import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { commands as dbCommands, type Human } from "@hypr/plugin-db";

const schema = z.object({
  record: z.boolean().optional(),
  calendarEventId: z.string().optional(),
});

export const Route = createFileRoute("/app/new")({
  validateSearch: zodValidator(schema),
  beforeLoad: async ({
    context: { queryClient, ongoingSessionStore, sessionsStore, userId },
    search: { record, calendarEventId },
  }) => {
    try {
      const sessionId = crypto.randomUUID();

      if (calendarEventId) {
        const event = await queryClient.fetchQuery({
          queryKey: ["event", calendarEventId],
          queryFn: () => dbCommands.getEvent(calendarEventId!),
        });

        console.log("creating a session from an event");
        console.log("event", event);

        const session = await dbCommands.upsertSession({
          id: sessionId,
          user_id: userId,
          created_at: new Date().toISOString(),
          visited_at: new Date().toISOString(),
          calendar_event_id: event?.id ?? null,
          title: event?.name ?? "",
          raw_memo_html: "",
          enhanced_memo_html: null,
          words: [],
          record_start: null,
          record_end: null,
          pre_meeting_memo_html: null,
        });

        // Add current user as participant
        await dbCommands.sessionAddParticipant(sessionId, userId);

        // Add event participants automatically
        if (event?.participants) {
          try {
            const eventParticipants = JSON.parse(event.participants) as Array<{
              name: string | null;
              email: string | null;
            }>;

            const allHumans = await dbCommands.listHumans(null);

            const processedEmails = new Set<string>();

            for (const participant of eventParticipants) {
              if (!participant.name && !participant.email) {
                continue;
              }

              // Skip duplicates in event data
              if (participant.email && processedEmails.has(participant.email)) {
                continue;
              }

              let humanToAdd: Human | null = null;

              // If there's an email, search for existing user with same email
              if (participant.email) {
                const existingHuman = allHumans.find(h => h.email === participant.email);

                if (existingHuman) {
                  humanToAdd = existingHuman;
                }

                processedEmails.add(participant.email);
              }

              // If no existing human found, create new one
              if (!humanToAdd) {
                let displayName = participant.name;
                if (!displayName && participant.email) {
                  displayName = participant.email.split("@")[0];
                }

                const newHuman: Human = {
                  id: crypto.randomUUID(),
                  full_name: displayName,
                  email: participant.email,
                  organization_id: null,
                  is_user: false,
                  job_title: null,
                  linkedin_username: null,
                };

                humanToAdd = await dbCommands.upsertHuman(newHuman);
              }

              if (humanToAdd) {
                await dbCommands.sessionAddParticipant(sessionId, humanToAdd.id);
              }
            }
          } catch (error) {
            console.error("Failed to parse or add event participants:", error);
          }
        }

        const { insert } = sessionsStore.getState();
        insert(session);
      } else {
        const session = await dbCommands.upsertSession({
          id: sessionId,
          user_id: userId,
          created_at: new Date().toISOString(),
          visited_at: new Date().toISOString(),
          calendar_event_id: null,
          title: "",
          raw_memo_html: "",
          enhanced_memo_html: null,
          words: [],
          record_start: null,
          record_end: null,
          pre_meeting_memo_html: null,
        });
        await dbCommands.sessionAddParticipant(sessionId, userId);

        const { insert } = sessionsStore.getState();
        insert(session);
      }

      if (record) {
        const { start } = ongoingSessionStore.getState();
        start(sessionId);
      }

      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "events",
      });

      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.some((key) => (typeof key === "string") && key.includes("session")),
      });

      return redirect({
        to: "/app/note/$id",
        params: { id: sessionId },
      });
    } catch (error) {
      console.error(error);
      return redirect({ to: "/app" });
    }
  },
});
