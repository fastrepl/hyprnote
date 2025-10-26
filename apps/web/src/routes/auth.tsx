import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { doAuth } from "@/functions/auth";

const validateSearch = z.object({
  flow: z.enum(["desktop", "web"]).default("web"),
});

export const Route = createFileRoute("/auth")({
  validateSearch,
  component: Component,
});

function Component() {
  const { flow } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await doAuth({
        data: {
          method: "email_otp",
          email,
          flow,
        },
      });

      if (!result) {
        setMessage({ type: "error", text: "No response from server" });
        return;
      }

      if (result.error) {
        setMessage({ type: "error", text: result.message || "Failed to send sign-in link" });
      } else {
        setMessage({ type: "success", text: result.message || "Check your email for the login link" });
        setEmail("");
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await doAuth({
        data: {
          method: "oauth",
          provider: "google",
          flow,
        },
      });

      if (!result) {
        setMessage({ type: "error", text: "No response from server" });
        setLoading(false);
        return;
      }

      if (result.error) {
        setMessage({ type: "error", text: result.message || "Failed to sign in with Google" });
        setLoading(false);
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-b from-stone-50 via-stone-100/50 to-stone-50">
      <div className="w-full max-w-md px-6">
        <div className="bg-white border border-neutral-200 rounded-sm p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-6 mx-auto size-28 shadow-xl border border-neutral-200 flex justify-center items-center rounded-4xl bg-transparent">
              <img
                src="/hyprnote_with_noise.png"
                alt="Hyprnote"
                className="size-24 rounded-3xl border border-neutral-200"
              />
            </div>
            <h1 className="text-3xl font-serif text-stone-800 mb-2">Welcome to Hyprnote</h1>
          </div>

          {/* Email Sign In Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full px-4 py-2 bg-stone-600 text-white font-medium rounded-lg hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Sending..." : "Continue"}
            </button>
          </form>

          {/* Message Display */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Terms */}
          <p className="text-xs text-neutral-500 mt-4 text-left">
            By signing up, you agree to Hyprnote's{" "}
            <a href="/terms" className="underline hover:text-neutral-700">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline hover:text-neutral-700">
              Privacy Policy
            </a>
            .
          </p>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-neutral-500">or</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full px-4 py-2 border border-neutral-300 rounded-lg font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Icon icon="logos:google-icon" />
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}
