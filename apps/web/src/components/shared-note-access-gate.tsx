import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CheckCircle,
  Clock,
  LockSimple,
  SignIn,
} from "@anlg/ui/components/icons";

import {
  SharedNoteLoading,
  SharedNotePrompt,
  sharedPrimaryButtonClassName,
  sharedSecondaryButtonClassName,
} from "@/components/shared-note-viewer";
import {
  cancelMySharedNoteAccessRequest,
  getMySharedNoteAccessRequest,
  requestSharedNoteAccess,
} from "@/functions/shared-notes";
import { getSharedNoteAccessGate } from "@/lib/shared-note-route-state";

const accessRequestQueryKey = (shareId: string) => [
  "shared-note-access-request",
  shareId,
];

export function SharedNoteAccessGate({
  returnPath,
  shareId,
  signedIn,
}: {
  returnPath: string;
  shareId: string;
  signedIn: boolean;
}) {
  const queryClient = useQueryClient();
  const accessRequestQuery = useQuery({
    queryKey: accessRequestQueryKey(shareId),
    queryFn: async () => {
      const result = await getMySharedNoteAccessRequest({ data: shareId });
      if (result.status !== "ready") {
        throw new Error("access request unavailable");
      }
      return result.request;
    },
    enabled: signedIn,
    retry: false,
  });
  const requestMutation = useMutation({
    mutationFn: async () => {
      const result = await requestSharedNoteAccess({
        data: { shareId, capability: "viewer" },
      });
      if (result.status !== "ready") {
        throw new Error(result.status);
      }
      return result.request;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: accessRequestQueryKey(shareId),
      });
    },
  });
  const cancelMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const result = await cancelMySharedNoteAccessRequest({ data: requestId });
      if (result.status !== "ready") {
        throw new Error(result.status);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: accessRequestQueryKey(shareId),
      });
    },
  });

  const request = accessRequestQuery.data ?? null;
  const gate = getSharedNoteAccessGate({
    requestStatus: request?.status ?? null,
    signedIn,
  });

  if (signedIn && accessRequestQuery.isPending) {
    return <SharedNoteLoading />;
  }

  if (gate === "sign-in") {
    const search = new URLSearchParams({ flow: "web", redirect: returnPath });
    return (
      <SharedNotePrompt
        icon={<SignIn className="size-6" aria-hidden="true" />}
        title="Sign in to view this note"
        description="This note is private. Sign in with the account it was shared with, or request access from the note owner after signing in."
        actions={
          <a
            href={`/auth/?${search.toString()}`}
            className={sharedPrimaryButtonClassName}
          >
            Sign in to Anarlog
          </a>
        }
      />
    );
  }

  if (gate === "pending" && request) {
    return (
      <SharedNotePrompt
        icon={<Clock className="size-6" aria-hidden="true" />}
        title="Access requested"
        description="The note owner can approve or decline your request. You’ll be able to open the note once it’s approved."
        actions={
          <>
            <button
              type="button"
              className={sharedSecondaryButtonClassName}
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate(request.requestId)}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel request"}
            </button>
            {cancelMutation.isError && (
              <p className="basis-full text-sm text-red-700" role="status">
                We couldn’t cancel this request. Please try again.
              </p>
            )}
          </>
        }
      />
    );
  }

  if (gate === "approved") {
    return (
      <SharedNotePrompt
        icon={<CheckCircle className="size-6" aria-hidden="true" />}
        title="Access approved"
        description="Your request was approved. Reload this page to open the note."
        actions={
          <button
            type="button"
            className={sharedPrimaryButtonClassName}
            onClick={() => window.location.reload()}
          >
            Reload note
          </button>
        }
      />
    );
  }

  const requestError =
    requestMutation.error instanceof Error
      ? requestMutation.error.message
      : null;

  return (
    <SharedNotePrompt
      icon={<LockSimple className="size-6" aria-hidden="true" />}
      title="You don’t have access to this note"
      description={
        request?.status === "denied"
          ? "Your previous request was declined. You can send a new request if you still need access."
          : "Ask the note owner for access. Once they approve your request, the note will open here."
      }
      actions={
        <>
          <button
            type="button"
            className={sharedPrimaryButtonClassName}
            disabled={requestMutation.isPending}
            onClick={() => requestMutation.mutate()}
          >
            {requestMutation.isPending ? "Requesting…" : "Request access"}
          </button>
          {requestError && (
            <p className="basis-full text-sm text-red-700" role="status">
              {requestError === "unavailable"
                ? "Access can’t be requested for this note right now. It may no longer be shared, or you cancelled a request too recently."
                : "We couldn’t send your request. Please try again."}
            </p>
          )}
        </>
      }
    />
  );
}
