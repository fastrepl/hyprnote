// https://github.com/agmmnn/tauri-controls/blob/f3592f0/apps/tauri-controls/src/tauri-controls/contexts/plugin-window.tsx

import React, { createContext, useContext } from "react";
import { fetch } from "@tauri-apps/plugin-http";

type AuthFetch = (
  path: string,
  init?: Parameters<typeof fetch>[1],
) => ReturnType<typeof fetch>;

const ServerContext = createContext<{
  base: URL;
  fetch: AuthFetch;
}>({ base: new URL("https://app.hyprnote.com"), fetch });

export const ServerProvider: React.FC<{
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

  return (
    <ServerContext.Provider value={{ base, fetch: authFetch }}>
      {children}
    </ServerContext.Provider>
  );
};

export const useServer = () => {
  const context = useContext(ServerContext);

  if (!context) {
    throw new Error("'useServer' must be used within a 'ServerProvider'");
  }

  return context;
};
