import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { open } from "@tauri-apps/plugin-shell";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { message } from "@tauri-apps/plugin-dialog";
import { commands } from "@/types/tauri.gen";
import { baseUrl } from "@/client";
import PushableButton from "@hypr/ui/components/ui/pushable-button";

export const Route = createFileRoute("/login")({
  component: Component,
  loader: async () => {
    // TODO
    // const fingerprint = await commands.getFingerprint();
    return {
      code: window.crypto.randomUUID(),
      fingerprint: "",
    };
  },
});

function Component() {
  const { code } = Route.useLoaderData();

  const [port, setPort] = useState<number | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    commands.startOauthServer().then((port) => {
      setPort(port);
      cleanup = () => {
        commands.cancelOauthServer(port);
      };
    });

    return () => cleanup?.();
  }, []);

  const url = useQuery({
    queryKey: ["oauth-url", port],
    enabled: !!port,
    queryFn: () => {
      const u = new URL(baseUrl);
      u.pathname = "/auth/connect";
      u.searchParams.set("c", code);
      u.searchParams.set("f", "fingerprint");
      u.searchParams.set("p", port!.toString());
      return u.toString();
    },
  });

  const handleSignIn = () => {
    if (url.data) {
      open(url.data);
    } else {
      message("Failed to start authentication process!");
    }
  };

  return (
    <PushableButton onClick={handleSignIn}>
      <Trans>Get Started</Trans>
    </PushableButton>
  );
}
