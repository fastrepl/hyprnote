import { z } from "zod";
import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";

import type { ConnectInput, ConnectOutput } from "../types";

const schema = z.object({
  c: z.string(),
  f: z.string(),
});

export const Route = createFileRoute("/auth/connect")({
  validateSearch: zodValidator(schema),
  component: Component,
});

function Component() {
  const search = Route.useSearch();
  const { c: code, f: _fingerprint } = search;
  const { isLoaded, userId, orgId } = useAuth();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async (input: ConnectInput) => {
      const response: ConnectOutput = await fetch("/api/web/connect", {
        method: "POST",
        body: JSON.stringify(input),
        headers: {
          "Content-Type": "application/json",
        },
      }).then((res) => res.json());

      return response;
    },
  });

  useEffect(() => {
    if (mutation.status === "success") {
      const { key } = mutation.data;
      window.location.href = `hypr://callback/connect?k=${key}`;
    }
  }, [mutation.status]);

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
          <Link href="https://hyprnote.com">Go to Hyprnote</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="h-[600px] w-[400px] bg-gray-200 rounded-lg">
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
          </div>
        ) : mutation.status === "pending" ? (
          <div>
            <span>Pending</span>
          </div>
        ) : (
          <button
            className="bg-blue-800 text-white p-1 rounded-md"
            disabled={mutation.status !== "idle"}
            onClick={() => mutation.mutate(payload)}
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}
