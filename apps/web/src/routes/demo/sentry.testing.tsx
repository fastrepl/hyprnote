/**
 * FILE OVERVIEW:
 * Purpose: Interactive demo page showcasing Sentry's monitoring capabilities
 * Key Concepts: Error tracking, Performance monitoring, Session replay
 * Module Type: Route Component
 * @ai_context: Demonstrates Sentry features through interactive examples with educational context
 */

import * as Sentry from "@sentry/tanstackstart-react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as fs from "node:fs/promises";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/demo/sentry/testing")({
  component: RouteComponent,
});

// Server function that will error
const badServerFunc = createServerFn({
  method: "GET",
}).handler(async () => {
  return await Sentry.startSpan(
    {
      name: "Reading non-existent file",
      op: "file.read",
    },
    async () => {
      try {
        await fs.readFile("./doesnt-exist", "utf-8");
        return true;
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
  );
});

// Server function that will succeed but be traced
const goodServerFunc = createServerFn({
  method: "GET",
}).handler(async () => {
  return await Sentry.startSpan(
    {
      name: "Successful server operation",
      op: "demo.success",
    },
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true };
    },
  );
});

function RouteComponent() {
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [hasError, setHasError] = useState<Record<string, boolean>>({});
  const [showTrace, setShowTrace] = useState<Record<string, boolean>>({});
  const [spanOps, setSpanOps] = useState<Record<string, string>>({});
  const [demoStep, setDemoStep] = useState(0);
  const [replayEvents, setReplayEvents] = useState<string[]>([]);
  const [copiedSpan, setCopiedSpan] = useState<string | null>(null);
  const startTimeRef = useRef<string>("");

  useEffect(() => {
    // Set initial timestamp only once on client
    if (!startTimeRef.current) {
      startTimeRef.current = new Date().toISOString();
    }

    if (demoStep > 0) {
      const secondsElapsed = (
        (new Date().getTime() - new Date(startTimeRef.current).getTime())
        / 1000
      ).toFixed(1);
      setReplayEvents((prev) => [
        ...prev,
        `Step ${demoStep}: +${secondsElapsed}s`,
      ]);
    }
  }, [demoStep]);

  const handleCopy = (operation: string) => {
    navigator.clipboard.writeText(operation);
    setCopiedSpan(operation);
    setTimeout(() => setCopiedSpan(null), 2000);
  };

  const handleClientError = async () => {
    setIsLoading((prev) => ({ ...prev, clientError: true }));
    setHasError((prev) => ({ ...prev, clientError: false }));
    setShowTrace((prev) => ({ ...prev, clientError: true }));

    try {
      await Sentry.startSpan(
        {
          name: "Client Error Flow Demo",
          op: "demo.client-error-flow",
        },
        async () => {
          Sentry.setContext("demo", {
            feature: "client-error-demo",
            triggered_at: new Date().toISOString(),
          });

          // Simulate a client-side error
          throw new Error("Client-side error demonstration");
        },
      );
    } catch (error) {
      setHasError((prev) => ({ ...prev, clientError: true }));
      setSpanOps((prev) => ({ ...prev, clientError: "demo.client-error-flow" }));
      Sentry.captureException(error);
    } finally {
      setIsLoading((prev) => ({ ...prev, clientError: false }));
    }
  };

  const handleServerError = async () => {
    setIsLoading((prev) => ({ ...prev, serverError: true }));
    setHasError((prev) => ({ ...prev, serverError: false }));
    setShowTrace((prev) => ({ ...prev, serverError: true }));

    try {
      await Sentry.startSpan(
        {
          name: "Server Error Flow Demo",
          op: "demo.server-error-flow",
        },
        async () => {
          Sentry.setContext("demo", {
            feature: "server-error-demo",
            triggered_at: new Date().toISOString(),
          });

          await badServerFunc();
        },
      );
    } catch (error) {
      setHasError((prev) => ({ ...prev, serverError: true }));
      setSpanOps((prev) => ({ ...prev, serverError: "demo.server-error-flow" }));
      Sentry.captureException(error);
    } finally {
      setIsLoading((prev) => ({ ...prev, serverError: false }));
    }
  };

  const handleClientTrace = async () => {
    setIsLoading((prev) => ({ ...prev, client: true }));
    setShowTrace((prev) => ({ ...prev, client: true }));

    await Sentry.startSpan(
      {
        name: "Client Operation",
        op: "demo.client",
      },
      async () => {
        // Simulate some client-side work
        await new Promise((resolve) => setTimeout(resolve, 1000));
      },
    );

    setSpanOps((prev) => ({ ...prev, client: "demo.client" }));
    setIsLoading((prev) => ({ ...prev, client: false }));
  };

  const handleServerTrace = async () => {
    setIsLoading((prev) => ({ ...prev, server: true }));
    setShowTrace((prev) => ({ ...prev, server: true }));

    try {
      await Sentry.startSpan(
        {
          name: "Server Operation",
          op: "demo.server",
        },
        async () => {
          await goodServerFunc();
        },
      );
      setSpanOps((prev) => ({ ...prev, server: "demo.server" }));
    } finally {
      setIsLoading((prev) => ({ ...prev, server: false }));
    }
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
          }
          .animate-fade-out {
            animation: fadeOut 2s ease-out forwards;
          }
        `,
        }}
      />
      <div
        className="min-h-[calc(100vh-32px)] text-white p-8"
        style={{
          backgroundImage: "radial-gradient(41.11% 49.93% at 50% 49.93%, #8d5494 0%, #563275 52.26%, #1f1633 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-8xl font-bold mb-4 text-white">Sentry</h1>
            <p className="text-4xl font-semibold text-white">
              Code <span className="inline-block -rotate-9">breaks</span>, fix it faster
            </p>
          </div>

          {/* Content Grid */}
          <div className="space-y-8">
            {/* Information Section - Top */}
            <div className="bg-[#1C2333] rounded-lg border border-gray-800 p-6">
              <div className="space-y-4 text-gray-300">
                <p>
                  The Sentry integration monitors this application across all routes; not just this one (we care about
                  all tabs) using our <code>@sentry/react</code> and <code>@sentry/node</code> packages.
                </p>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-[#2D3555] rounded-lg p-4 border border-gray-700 hover:border-purple-500/50 transition-colors">
                    <div className="font-bold mb-1">Error Monitoring</div>
                    <div className="text-sm text-gray-400">
                      across client side and server functions
                    </div>
                  </div>
                  <div className="bg-[#2D3555] rounded-lg p-4 border border-gray-700 hover:border-purple-500/50 transition-colors">
                    <div className="font-bold mb-1">Tracing and Spans</div>
                    <div className="text-sm text-gray-400">
                      for client and server side performance
                    </div>
                  </div>
                  <div className="bg-[#2D3555] rounded-lg p-4 border border-gray-700 hover:border-purple-500/50 transition-colors">
                    <div className="font-bold mb-1">Session replay</div>
                    <div className="text-sm text-gray-400">
                      real user session playback
                    </div>
                  </div>
                  <div className="bg-[#2D3555] rounded-lg p-4 border border-gray-700 hover:border-purple-500/50 transition-colors">
                    <div className="font-bold mb-1">Real-time alerts</div>
                    <div className="text-sm text-gray-400">
                      because sleep is overrated anyway
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Testing Sections - Bottom Grid */}
            <div className="grid grid-cols-2 gap-8">
              {/* Client Side Testing */}
              <div className="bg-[#1C2333] rounded-lg p-6 border border-gray-800">
                <h2 className="text-xl font-semibold text-white mb-6">
                  Client-Side Testing
                </h2>
                <div className="space-y-6">
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setDemoStep((prev) => prev + 1);
                        handleClientError();
                      }}
                      className="w-full text-white rounded-md p-4 relative overflow-hidden group"
                      style={{
                        background: "linear-gradient(120deg, #c83852, #b44092 25%, #6a5fc1 50%, #452650 55%, #452650)",
                        backgroundPosition: "2% 0",
                        backgroundSize: "250% 100%",
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <div className="flex items-center mb-2">
                          <span className="font-medium">
                            Trigger Client-Side Error
                          </span>
                        </div>
                      </div>
                    </button>
                    {hasError.clientError && (
                      <div className="mt-4 space-y-2">
                        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-2">
                          <div className="flex items-center text-red-400 text-sm">
                            <svg
                              className="w-4 h-4 mr-2"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <title>Red Warning Sign</title>
                              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Client-side error captured and traced
                          </div>
                        </div>
                        <div className="bg-purple-900/20 border border-purple-500/50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="relative">
                              <button
                                type="button"
                                className={`inline-flex items-center bg-purple-900/40 px-3 py-1.5 rounded-lg border border-purple-500/50 cursor-pointer hover:bg-purple-900/60 transition-all ${
                                  copiedSpan === spanOps.clientError ? "scale-95" : ""
                                }`}
                                onClick={() => handleCopy(spanOps.clientError)}
                                title="Click to copy operation name"
                              >
                                <span className="text-purple-300 text-sm font-medium mr-2">
                                  span.op
                                </span>
                                <code className="text-purple-400 text-sm font-mono">
                                  {spanOps.clientError}
                                </code>
                              </button>
                              {copiedSpan === spanOps.clientError && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500/90 text-white text-xs px-2 py-1 rounded animate-fade-out">
                                  Copied!
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setDemoStep((prev) => prev + 1);
                        handleClientTrace();
                      }}
                      className="w-full text-white rounded-md p-4 relative overflow-hidden group"
                      style={{
                        background: "linear-gradient(120deg, #c83852, #b44092 25%, #6a5fc1 50%, #452650 55%, #452650)",
                        backgroundPosition: "2% 0",
                        backgroundSize: "250% 100%",
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <div className="flex items-center mb-2">
                          <span className="font-medium">
                            Test Client-Side Span
                          </span>
                        </div>
                      </div>
                    </button>
                    {showTrace.client && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              isLoading.client ? "bg-blue-500 animate-pulse" : "bg-green-500"
                            }`}
                          />
                          <div className="ml-2 flex-1">
                            <div className="h-1.5 bg-[#2D3555] rounded">
                              <div
                                className="h-full bg-blue-500 rounded transition-all duration-500"
                                style={{
                                  width: isLoading.client ? "60%" : "100%",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        {!isLoading.client && spanOps.client && (
                          <div className="bg-purple-900/20 border border-purple-500/50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="relative">
                                <button
                                  type="button"
                                  className={`inline-flex items-center bg-purple-900/40 px-3 py-1.5 rounded-lg border border-purple-500/50 cursor-pointer hover:bg-purple-900/60 transition-all ${
                                    copiedSpan === spanOps.client ? "scale-95" : ""
                                  }`}
                                  onClick={() => handleCopy(spanOps.client)}
                                  title="Click to copy operation name"
                                >
                                  <span className="text-purple-300 text-sm font-medium mr-2">
                                    span.op
                                  </span>
                                  <code className="text-purple-400 text-sm font-mono">
                                    {spanOps.client}
                                  </code>
                                </button>
                                {copiedSpan === spanOps.client && (
                                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500/90 text-white text-xs px-2 py-1 rounded animate-fade-out">
                                    Copied!
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Server Side Testing */}
              <div className="bg-[#1C2333] rounded-lg p-6 border border-gray-800">
                <h2 className="text-xl font-semibold text-white mb-6">
                  Server-Side Testing
                </h2>
                <div className="space-y-6">
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setDemoStep((prev) => prev + 1);
                        handleServerError();
                      }}
                      className="w-full text-white rounded-md p-4 relative overflow-hidden group"
                      style={{
                        background: "linear-gradient(120deg, #c83852, #b44092 25%, #6a5fc1 50%, #452650 55%, #452650)",
                        backgroundPosition: "2% 0",
                        backgroundSize: "250% 100%",
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <div className="flex items-center mb-2">
                          <span className="font-medium">
                            Trigger Server Error
                          </span>
                        </div>
                      </div>
                    </button>
                    {hasError.serverError && (
                      <div className="mt-4 space-y-2">
                        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                          <div className="flex items-center text-red-400 text-sm">
                            <svg
                              className="w-4 h-4 mr-2"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <title>Red Warning Sign</title>
                              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Server-side error captured and traced
                          </div>
                        </div>
                        <div className="bg-purple-900/20 border border-purple-500/50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="relative">
                              <button
                                type="button"
                                className={`inline-flex items-center bg-purple-900/40 px-3 py-1.5 rounded-lg border border-purple-500/50 cursor-pointer hover:bg-purple-900/60 transition-all ${
                                  copiedSpan === spanOps.serverError ? "scale-95" : ""
                                }`}
                                onClick={() => handleCopy(spanOps.serverError)}
                                title="Click to copy operation name"
                              >
                                <span className="text-purple-300 text-sm font-medium mr-2">
                                  span.op
                                </span>
                                <code className="text-purple-400 text-sm font-mono">
                                  {spanOps.serverError}
                                </code>
                              </button>
                              {copiedSpan === spanOps.serverError && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500/90 text-white text-xs px-2 py-1 rounded animate-fade-out">
                                  Copied!
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setDemoStep((prev) => prev + 1);
                        handleServerTrace();
                      }}
                      className="w-full text-white rounded-md p-4 relative overflow-hidden group"
                      style={{
                        background: "linear-gradient(120deg, #c83852, #b44092 25%, #6a5fc1 50%, #452650 55%, #452650)",
                        backgroundPosition: "2% 0",
                        backgroundSize: "250% 100%",
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <div className="flex items-center mb-2">
                          <span className="font-medium">Test server Trace</span>
                        </div>
                      </div>
                    </button>
                    {showTrace.server && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              isLoading.server ? "bg-purple-500 animate-pulse" : "bg-green-500"
                            }`}
                          />
                          <div className="ml-2 flex-1">
                            <div className="h-1.5 bg-[#2D3555] rounded">
                              <div
                                className="h-full bg-purple-500 rounded transition-all duration-500"
                                style={{
                                  width: isLoading.server ? "60%" : "100%",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        {!isLoading.server && spanOps.server && (
                          <div className="bg-purple-900/20 border border-purple-500/50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div className="relative">
                                <button
                                  type="button"
                                  className={`inline-flex items-center bg-purple-900/40 px-3 py-1.5 rounded-lg border border-purple-500/50 cursor-pointer hover:bg-purple-900/60 transition-all ${
                                    copiedSpan === spanOps.server ? "scale-95" : ""
                                  }`}
                                  onClick={() => handleCopy(spanOps.server)}
                                  title="Click to copy operation name"
                                >
                                  <span className="text-purple-300 text-sm font-medium mr-2">
                                    span.op
                                  </span>
                                  <code className="text-purple-400 text-sm font-mono">
                                    {spanOps.server}
                                  </code>
                                </button>
                                {copiedSpan === spanOps.server && (
                                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500/90 text-white text-xs px-2 py-1 rounded animate-fade-out">
                                    Copied!
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
