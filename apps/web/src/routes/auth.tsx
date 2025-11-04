import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Image } from "@/components/image";
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

  return (
    <Container>
      <Header />
      <EmailAuthForm flow={flow} />
      <PrivacyPolicy />
      <Divider />
      <div className="space-y-2">
        <OAuthButton flow={flow} provider="google" />
        <OAuthButton flow={flow} provider="github" />
      </div>
    </Container>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn([
        "flex items-center justify-center min-h-screen p-4",
        "bg-linear-to-b from-stone-50 via-stone-100/50 to-stone-50",
      ])}
    >
      <div className="bg-white border border-neutral-200 rounded-sm p-8 max-w-md mx-auto">
        {children}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="text-center mb-8">
      <div
        className={cn([
          "mb-6 mx-auto size-28",
          "shadow-xl border border-neutral-200",
          "flex justify-center items-center",
          "rounded-4xl bg-transparent",
        ])}
      >
        <Image
          src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/icon.png"
          alt="Hyprnote"
          width={96}
          height={96}
          className={cn([
            "size-24",
            "rounded-3xl border border-neutral-200",
          ])}
        />
      </div>
      <h1 className="text-3xl font-serif text-stone-800 mb-2">Welcome to Hyprnote</h1>
    </div>
  );
}

function PrivacyPolicy() {
  return (
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
  );
}

function Divider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-neutral-200"></div>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-white text-neutral-500">or</span>
      </div>
    </div>
  );
}

function EmailAuthForm({ flow }: { flow: "desktop" | "web" }) {
  const emailAuthMutation = useMutation({
    mutationFn: (email: string) =>
      doAuth({
        data: {
          method: "email_otp",
          email,
          flow,
        },
      }),
    onSuccess: (result) => {
      if (result?.success) {
        form.reset();
      }
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onChange: z.object({
        email: z.email("Please enter a valid email."),
      }),
    },
    onSubmit: ({ value }) => {
      emailAuthMutation.mutate(value.email);
    },
  });

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field
          name="email"
          children={(field) => (
            <div>
              <input
                id="email"
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Your email"
                disabled={emailAuthMutation.isPending}
                className={cn([
                  "w-full px-4 py-2",
                  "border border-neutral-300 rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                ])}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="mt-1 text-sm text-red-400">
                  {field.state.meta.errors[0]?.message ?? "An unexpected error occurred"}
                </p>
              )}

              <button
                type="submit"
                disabled={emailAuthMutation.isPending || field.state.meta.errors.length > 0 || !field.state.value}
                className={cn([
                  "w-full px-4 py-2 mt-4",
                  "bg-stone-600 text-white font-medium",
                  "rounded-lg",
                  "hover:bg-stone-700",
                  "focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors",
                ])}
              >
                {emailAuthMutation.isPending ? "Loading..." : "Continue"}
              </button>
            </div>
          )}
        />
      </form>
    </>
  );
}

function OAuthButton({ flow, provider }: { flow: "desktop" | "web"; provider: "google" | "github" }) {
  const oauthMutation = useMutation({
    mutationFn: (provider: "google" | "github") =>
      doAuth({
        data: {
          method: "oauth",
          provider,
          flow,
        },
      }),
    onSuccess: (result) => {
      if (result?.url) {
        window.location.href = result.url;
      }
    },
  });
  return (
    <button
      onClick={() => oauthMutation.mutate(provider)}
      disabled={oauthMutation.isPending}
      className={cn([
        "w-full px-4 py-2",
        "border border-neutral-300",
        "rounded-lg font-medium text-neutral-700",
        "hover:bg-neutral-50",
        "focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-colors",
        "flex items-center justify-center gap-2",
      ])}
    >
      <Icon icon={provider === "google" ? "logos:google-icon" : "logos:github-icon"} />
      Sign in with {provider.charAt(0).toUpperCase() + provider.slice(1)}
    </button>
  );
}
