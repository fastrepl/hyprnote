// https://github.com/agmmnn/tauri-controls/blob/f3592f0/apps/tauri-controls/src/tauri-controls/contexts/plugin-window.tsx

import React, { createContext, useContext } from "react";
import { fetch } from "@tauri-apps/plugin-http";

import type { EnhanceRequest } from "@/types/server";
import { CalendarIntegration } from "@/types";

type Client = {
  listIntegrations: () => Promise<any[]>;
  getIntegrationURL: (
    type: Exclude<CalendarIntegration, "apple-calendar">,
  ) => string;
  enhance: (req: EnhanceRequest) => Promise<Response>;
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
      return [];
    },
    getIntegrationURL: (type) => {
      return new URL(`/integrations?provider=${type}`, base).toString();
    },
    enhance: (req: EnhanceRequest) => {
      return authFetch("/api/native/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
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
