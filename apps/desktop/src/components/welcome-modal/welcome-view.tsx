import { Trans, useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { message } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";

import { baseUrl } from "@/client";
import { commands as authCommands, events } from "@hypr/plugin-auth";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";

export const WelcomeView = () => {
  const { t } = useLingui();
  const [port, setPort] = useState<number | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let unlisten: (() => void) | undefined;

    authCommands.startOauthServer().then((port) => {
      setPort(port);

      events.authEvent
        .listen(({ payload }) => {
          if (payload === "success") {
            message("Successfully authenticated!");
            return;
          }

          if (payload.error) {
            message("Error occurred while authenticating!");
            return;
          }
        })
        .then((fn) => {
          unlisten = fn;
        });

      cleanup = () => {
        unlisten?.();
        authCommands.stopOauthServer(port);
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
      u.searchParams.set("c", window.crypto.randomUUID());
      u.searchParams.set("f", "fingerprint");
      u.searchParams.set("p", port!.toString());
      return u.toString();
    },
  });

  const handleStartCloud = () => {
    if (url.data) {
      openUrl(url.data);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <img
        src="/assets/logo.svg"
        alt="HYPRNOTE"
        className="mb-6 w-[300px]"
      />

      <TextAnimate
        animation="slideUp"
        by="word"
        once
        className="mb-20 text-center text-2xl font-medium text-neutral-600"
      >
        {t`The AI Meeting Notepad`}
      </TextAnimate>

      <PushableButton
        disabled={!port}
        onClick={handleStartCloud}
        className="w-full max-w-sm"
      >
        <Trans>Get Started</Trans>
      </PushableButton>
    </div>
  );
};
