// https://github.com/agmmnn/tauri-controls/blob/f3592f0/apps/tauri-controls/src/tauri-controls/contexts/plugin-window.tsx

import React, { createContext, useContext } from "react";
import { fetch } from "@tauri-apps/plugin-http";
import { Channel } from "@tauri-apps/api/core";

import {
  commands,
  type NangoIntegration,
  type EnhanceRequest,
  type CalendarIntegration,
} from "@/types";

type Client = {
  listIntegrations: () => Promise<NangoIntegration[]>;
  getIntegrationURL: (
    type: Exclude<CalendarIntegration, "apple-calendar">,
  ) => string;
  enhance: (req: EnhanceRequest) => ReadableStream;
};

const HyprContext = createContext<{ client: Client }>({
  client: null as unknown as Client,
});

export const HyprProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const base = new URL(
    import.meta.env.DEV ? "http://localhost:1234" : "https://app.hyprnote.com",
  );

  const token = "123";

  const authFetch = (path: string, init?: Parameters<typeof fetch>[1]) => {
    const url = new URL(path, base);

    const opts = {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
      },
    };

    return fetch(url, opts);
  };

  const client: Client = {
    listIntegrations: async () => {
      return authFetch("/api/native/user/integrations", { method: "GET" }).then(
        (res) => res.json(),
      );
    },
    getIntegrationURL: (type) => {
      return new URL(`/integrations?provider=${type}`, base).toString();
    },
    enhance: (req: EnhanceRequest) => {
      const channel = new Channel<string>();
      const encoder = new TextEncoder();

      return new ReadableStream({
        start(controller) {
          channel.onmessage = (message) => {
            try {
              controller.enqueue(encoder.encode(message));
            } catch (_ignored) {}
          };

          commands.runEnhance(req, channel).finally(() => {
            channel.onmessage = () => {};
            controller.close();
          });
        },
      });
    },
  };

  return (
    <HyprContext.Provider value={{ client }}>{children}</HyprContext.Provider>
  );
};

export const useHypr = () => {
  const context = useContext(HyprContext);

  if (!context) {
    throw new Error("'useHypr' must be used within a 'HyprProvider'");
  }

  return context;
};
