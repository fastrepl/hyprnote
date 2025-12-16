import { Icon } from "@iconify-icon/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { doAuth } from "@/functions/auth";

const validateSearch = z.object({
  flow: z.enum(["desktop", "web"]).default("web"),
  scheme: z.string().optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch,
  component: Component,
});

function Component() {
  const { flow, scheme, redirect } = Route.useSearch();

  return (
    <Container>
      <Header />
      <div className="space-y-2">
        <OAuthButton
          flow={flow}
          scheme={scheme}
          redirect={redirect}
          provider="google"
        />
        <OAuthButton
          flow={flow}
          scheme={scheme}
          redirect={redirect}
          provider="github"
        />
      </div>
      <PrivacyPolicy />
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
          src="/api/images/hyprnote/icon.png"
          alt="Hyprnote"
          width={96}
          height={96}
          className={cn(["size-24", "rounded-3xl border border-neutral-200"])}
        />
      </div>
      <h1 className="text-3xl font-serif text-stone-800 mb-2">
        Welcome to Hyprnote
      </h1>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <p className="text-xs text-neutral-500 mt-4 text-left">
      By signing up, you agree to Hyprnote's{" "}
      <a href="/legal/terms" className="underline hover:text-neutral-700">
        Terms of Service
      </a>{" "}
      and{" "}
      <a href="/legal/privacy" className="underline hover:text-neutral-700">
        Privacy Policy
      </a>
      .
    </p>
  );
}

function OAuthButton({
  flow,
  scheme,
  redirect,
  provider,
}: {
  flow: "desktop" | "web";
  scheme?: string;
  redirect?: string;
  provider: "google" | "github";
}) {
  const oauthMutation = useMutation({
    mutationFn: (provider: "google" | "github") =>
      doAuth({
        data: {
          provider,
          flow,
          scheme,
          redirect,
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
        "w-full px-4 py-2 cursor-pointer",
        "border border-neutral-300",
        "rounded-lg font-medium text-neutral-700",
        "hover:bg-neutral-50",
        "focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-colors",
        "flex items-center justify-center gap-2",
      ])}
    >
      {provider === "google" && <Icon icon="logos:google-icon" />}
      {provider === "github" && <Icon icon="logos:github-icon" />}
      Sign in with {provider.charAt(0).toUpperCase() + provider.slice(1)}
    </button>
  );
}
