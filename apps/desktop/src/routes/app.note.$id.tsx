import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import EditorArea from "@/components/editor-area";
import { useHypr } from "@/contexts";
import { useEnhancePendingState } from "@/hooks/enhance-pending";
import { commands as dbCommands, type Human, type Session } from "@hypr/plugin-db";
import {
  commands as windowsCommands,
  events as windowsEvents,
  getCurrentWebviewWindowLabel,
} from "@hypr/plugin-windows";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";

export const Route = createFileRoute("/app/note/$id")({
  beforeLoad: ({ context: { queryClient, sessionsStore, userId }, params: { id } }) => {
    return queryClient.fetchQuery({
      queryKey: ["session", id],
      queryFn: async () => {
        let session: Session | null = null;

        try {
          const [s, _] = await Promise.all([
            dbCommands.getSession({ id }),
            dbCommands.visitSession(id),
          ]);
          session = s;
        } catch (e) {
          console.error(e);
        }

        if (!session) {
          return redirect({ to: "/app/new" });
        }

        if (session.calendar_event_id) {
          try {
            const event = await dbCommands.getEvent(session.calendar_event_id);

            if (event?.participants) {
              // participants of events from the DB event table
              const eventParticipants = JSON.parse(event.participants) as Array<{
                name: string | null;
                email: string | null;
              }>;

              const [allHumans, currentParticipants, deletedParticipantIds] = await Promise.all([
                dbCommands.listHumans(null),
                dbCommands.sessionListParticipants(id),
                dbCommands.sessionListDeletedParticipantIds(id),
              ]);

              // emails of current participants in the session
              const currentParticipantEmails = new Set(
                currentParticipants.map(p => p.email).filter(Boolean),
              );

              // list of participants who were marked as deleted in the session
              const deletedIds = new Set(deletedParticipantIds);

              for (const participant of eventParticipants) {
                // Skip if no email address
                if (!participant.email) {
                  continue;
                }

                // Skip if already a current participant (not deleted)
                if (currentParticipantEmails.has(participant.email)) {
                  continue;
                }

                // Check if human already exists by email
                let existingHuman = allHumans.find(h => h.email === participant.email);

                if (existingHuman) {
                  // Skip if this human is marked as deleted for this session
                  if (deletedIds.has(existingHuman.id)) {
                    continue;
                  }

                  // Use existing human
                  await dbCommands.sessionAddParticipant(id, existingHuman.id);
                } else {
                  // Create new human
                  const displayName = participant.name || participant.email;

                  const newHuman: Human = {
                    id: crypto.randomUUID(),
                    full_name: displayName,
                    email: participant.email,
                    organization_id: null,
                    is_user: false,
                    job_title: null,
                    linkedin_username: null,
                  };

                  const createdHuman = await dbCommands.upsertHuman(newHuman);
                  await dbCommands.sessionAddParticipant(id, createdHuman.id);
                }
              }
            }
          } catch (error) {
            console.error("Failed to sync participants:", error);
          }
        }

        const { insert } = sessionsStore.getState();
        insert(session);

        return session;
      },
    });
  },
  component: Component,
});

function Component() {
  const { id: sessionId } = Route.useParams();

  const { getLatestSession, session } = useSession(sessionId, (s) => ({ getLatestSession: s.get, session: s.session }));
  const getOngoingSession = useOngoingSession((s) => s.get);

  useEffect(() => {
    const isEmpty = (s: string | null) => s === "<p></p>" || !s;

    return () => {
      const { session } = getLatestSession();
      const { sessionId: ongoingSessionId } = getOngoingSession();

      const shouldDelete = !session.title
        && isEmpty(session.raw_memo_html)
        && isEmpty(session.enhanced_memo_html)
        && session.words.length === 0
        && ongoingSessionId !== session.id;

      if (shouldDelete) {
        mutation.mutate();
      }
    };
  }, [getLatestSession]);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: ["delete-session", sessionId],
    mutationFn: () => dbCommands.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1">
        <main className="flex h-full overflow-hidden bg-white">
          <div className="h-full flex-1 pt-6">
            <OnboardingSupport session={session} />
            <EditorArea editable={getCurrentWebviewWindowLabel() === "main"} sessionId={sessionId} />
          </div>
        </main>
      </div>
    </div>
  );
}

function OnboardingSupport({ session }: { session: Session }) {
  const video = "SGv6JaZsKqF50102xk6no2ybUqqSyngeWO401ic8qJdZR4";

  const navigate = useNavigate();

  const { onboardingSessionId } = useHypr();

  const isEnhancePending = useEnhancePendingState(session.id);

  const { stopOngoingSession, ongoingSessionId, ongoingSessionStatus } = useOngoingSession((
    s,
  ) => ({
    stopOngoingSession: s.stop,
    ongoingSessionId: s.sessionId,
    ongoingSessionStatus: s.status,
  }));

  // we want to "stop-and-go-back" from anywhere, when onboarding video is destroyed.
  useEffect(() => {
    let unlisten: () => void;

    windowsEvents.windowDestroyed.listen(({ payload: { window } }) => {
      if (window.type === "video" && window.value === video) {
        stopOngoingSession();

        if (onboardingSessionId) {
          navigate({ to: "/app/note/$id", params: { id: onboardingSessionId } });
        }
      }
    }).then((u) => {
      unlisten = u;
    });

    return () => unlisten?.();
  }, []);

  useEffect(() => {
    if (onboardingSessionId !== ongoingSessionId) {
      return;
    }

    if (isEnhancePending) {
      return;
    }

    if (ongoingSessionStatus === "running_active") {
      windowsCommands.windowShow({ type: "video", value: video });
    }
  }, [onboardingSessionId, session.id, isEnhancePending, ongoingSessionStatus]);

  return null;
}
