import { z } from "zod";
import { useState } from "react";
import { zodValidator } from "@tanstack/zod-adapter";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { clsx } from "clsx";
import { Particles } from "@hypr/ui/components/ui/particles";
import { Button } from "@hypr/ui/components/ui/button";

import {
  client,
  postApiWebConnectMutation,
  type RequestParams,
  type ResponseParams,
} from "../client";

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
  const search = Route.useSearch();
  const navigate = useNavigate();

  const { isLoaded, userId } = useAuth();
  const [redirectURL, setRedirectURL] = useState<string>("");

  const { c: code, f: fingerprint, p: port } = search;

  const mutation = useMutation({
    ...postApiWebConnectMutation({ client }),
    onSuccess({ ui, ai, st, dt }, _variables, _context) {
      const url = new URL(`http://localhost:${port}`);

      const params: ResponseParams = { ui, ai, st, dt };
      url.searchParams.set("ui", params.ui);
      url.searchParams.set("ai", params.ai);
      url.searchParams.set("st", params.st);
      url.searchParams.set("dt", params.dt);

      const u = url.toString();
      try {
        window.open(u);
      } catch (e) {
        console.error(e);
      } finally {
        setRedirectURL(u);
      }
    },
  });

  if (isLoaded && !userId) {
    throw navigate({ to: "/auth/sign-in", search });
  }

  const payload: RequestParams = {
    c: code,
    f: fingerprint,
    p: port,
  };

  if (!code) {
    return (
      <main className="relative flex h-screen flex-col items-center justify-center overflow-auto p-4">
        <header
          className={clsx([
            "absolute left-0 right-0 top-0 z-10 min-h-11 px-2",
            "flex w-full items-center justify-between",
            "bg-transparent",
          ])}
        >
          <div /> {/* Empty div for spacing */}
        </header>

        <div className="z-10 flex w-full flex-col items-center justify-center">
          <div className="flex flex-col items-center">
            <h1 className="mb-4 text-5xl font-bold md:text-6xl lg:text-7xl">
              Connection Error
            </h1>

            <p className="mb-12 text-center text-base font-medium text-neutral-600 md:text-lg lg:text-xl">
              No connection code provided
            </p>

            <Button
              size="lg"
              variant="outline"
              className="w-full min-h-11 text-lg"
              onClick={() => (window.location.href = "https://hyprnote.com")}
            >
              Go to Hyprnote
            </Button>
          </div>
        </div>

        <Particles
          className="absolute inset-0 z-0"
          quantity={100}
          ease={80}
          color={"#000000"}
          refresh
        />
      </main>
    );
  }

  return (
    <main className="relative flex h-screen flex-col items-center justify-center overflow-auto p-4">
      <div className="z-10 flex w-full flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          <h1 className="mb-4 text-5xl font-bold md:text-6xl lg:text-7xl">
            Sync to Cloud
          </h1>

          <p className="mb-12 text-center text-base font-medium text-neutral-600 md:text-lg lg:text-xl">
            Keep your data securely stored in Hyprnote Cloud across multiple
            devices
          </p>

          <div className="w-full max-w-md">
            {!isLoaded ? (
              <div className="flex flex-col items-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-neutral-600 border-t-transparent rounded-full mb-4"></div>
                <p className="text-neutral-600">Loading your account...</p>
              </div>
            ) : (
              <>
                {mutation.status === "idle" && (
                  <Button
                    size="lg"
                    className="w-full min-h-11 text-lg"
                    disabled={mutation.status !== "idle"}
                    onClick={() => mutation.mutate({ body: payload })}
                  >
                    Start sync
                  </Button>
                )}

                {mutation.status === "pending" && (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-800 mb-4">
                      <div className="animate-spin h-6 w-6 border-3 border-neutral-100 border-t-transparent rounded-full"></div>
                    </div>
                    <p className="text-lg font-medium text-neutral-100">
                      Connecting...
                    </p>
                  </div>
                )}

                {mutation.status === "success" && (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-800 mb-4">
                      <svg
                        className="w-6 h-6 text-neutral-100"
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
                    <p className="text-lg font-medium text-neutral-100 mb-2">
                      Connected Successfully
                    </p>
                    <p className="text-neutral-400 mb-3">
                      You should be redirected automatically.
                    </p>
                    <p className="text-neutral-400 mb-4">
                      If not, please click the button below:
                    </p>
                    <Button
                      size="lg"
                      className="min-h-11 text-lg"
                      onClick={() => {
                        window.open(
                          redirectURL,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                    >
                      Open Hyprnote
                    </Button>
                  </div>
                )}

                {mutation.status === "error" && (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-800 mb-4">
                      <svg
                        className="w-6 h-6 text-neutral-100"
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
                    <p className="text-lg font-medium text-neutral-100 mb-2">
                      Connection Failed
                    </p>
                    <p className="text-neutral-400 mb-2">
                      There was an error connecting to Hyprnote.
                    </p>
                    <details className="text-left mt-4">
                      <summary className="text-sm text-neutral-400 cursor-pointer">
                        View error details
                      </summary>
                      <pre className="mt-2 p-2 bg-neutral-800 rounded text-xs overflow-auto max-h-36 text-neutral-300">
                        {JSON.stringify(mutation.error, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Particles
        className="absolute inset-0 z-0"
        quantity={100}
        ease={80}
        color={"#000000"}
        refresh
      />
    </main>
  );
}
