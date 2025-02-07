import { z } from "zod";
import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";

import {
  client,
  postApiWebConnectMutation,
  type ConnectInput,
} from "../client";

const schema = z.object({
  c: z.string(),
  f: z.string(),
  p: z.number(),
});

export const Route = createFileRoute("/auth/connect")({
  validateSearch: zodValidator(schema),
  component: Component,
});

function Component() {
  const { c: code, f: _fingerprint, p: port } = Route.useSearch();
  const { isLoaded, userId, orgId } = useAuth();
  const navigate = useNavigate();

  const mutation = useMutation({
    ...postApiWebConnectMutation({ client }),
    onSuccess({ key }, _variables, _context) {
      window.open(`http://localhost:${port}?k=${key}`);
    },
  });

  if (isLoaded && !userId) {
    throw navigate({ to: "/auth/sign-in" });
  }

  const payload: ConnectInput = {
    code,
    fingerprint: _fingerprint,
    org_id: orgId ?? null,
    user_id: userId!,
  };

  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div>
          <p>No code provided</p>
          <a href="https://hyprnote.com">Go to Hyprnote</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="h-[600px] w-[400px] bg-neutral-200 rounded-lg">
        {isLoaded ? (
          <div>
            <span>Code: {code}</span>
          </div>
        ) : (
          <div>
            <span>Loading...</span>
          </div>
        )}

        {mutation.status === "success" ? (
          <div>
            <span>Success</span>
          </div>
        ) : mutation.status === "error" ? (
          <div>
            <span>Error</span>
            <pre>{JSON.stringify(mutation.error)}</pre>
          </div>
        ) : mutation.status === "pending" ? (
          <div>
            <span>Pending</span>
          </div>
        ) : (
          <button
            className="bg-blue-800 text-white p-1 rounded-md"
            disabled={mutation.status !== "idle"}
            onClick={() => mutation.mutate({ body: payload })}
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}
