import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";

import {
  client,
  postApiWebConnectMutation,
  type ConnectInput,
} from "../client";

import type { RequestParams } from "@hypr/plugin-auth";
import { assert, type TypeEqualityGuard } from "../utils";

export const schema = z.object({
  c: z.string(),
  f: z.string(),
  p: z.number(),
});

assert<TypeEqualityGuard<z.infer<typeof schema>, RequestParams>>();

export const Route = createFileRoute("/auth/connect")({
  validateSearch: zodValidator(schema),
  component: Component,
});

function Component() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { isLoaded, userId, orgId } = useAuth();

  const { c: code, f: _fingerprint, p: port } = search;

  const mutation = useMutation({
    ...postApiWebConnectMutation({ client }),
    onSuccess({ key, human_id }, _variables, _context) {
      window.open(`http://localhost:${port}?k=${key}&u=${human_id}`);
    },
  });

  if (isLoaded && !userId) {
    throw navigate({ to: "/auth/sign-in", search });
  }

  const payload: ConnectInput = {
    code,
    fingerprint: _fingerprint,
    org_id: orgId ?? null,
    user_id: userId!,
  };

  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="p-8 bg-white shadow-lg rounded-xl text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Connection Error
          </h2>
          <p className="text-gray-600 mb-6">No connection code provided</p>
          <a
            href="https://hyprnote.com"
            className="inline-block px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Hyprnote
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-xl">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          Connect to Hyprnote
        </h2>

        {!isLoaded ? (
          <div className="flex flex-col items-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-600">Loading your account...</p>
          </div>
        ) : (
          <div className="mb-6 p-3 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-500">Connection Code</p>
            <p className="font-mono text-gray-800">{code}</p>
          </div>
        )}

        {mutation.status === "success" ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-800 mb-2">
              Connected Successfully
            </p>
            <p className="text-gray-600">
              Your application window should open automatically.
            </p>
          </div>
        ) : mutation.status === "error" ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-800 mb-2">
              Connection Failed
            </p>
            <p className="text-gray-600 mb-2">
              There was an error connecting to Hyprnote.
            </p>
            <details className="text-left mt-4">
              <summary className="text-sm text-gray-500 cursor-pointer">
                View error details
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-36">
                {JSON.stringify(mutation.error, null, 2)}
              </pre>
            </details>
          </div>
        ) : mutation.status === "pending" ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
              <div className="animate-spin h-6 w-6 border-3 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
            <p className="text-lg font-medium text-gray-800">Connecting...</p>
          </div>
        ) : (
          <button
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            disabled={mutation.status !== "idle"}
            onClick={() => mutation.mutate({ body: payload })}
          >
            Connect to Hyprnote
          </button>
        )}
      </div>
    </div>
  );
}
