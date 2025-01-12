// https://github.com/agmmnn/tauri-controls/blob/f3592f0/apps/tauri-controls/src/tauri-controls/contexts/plugin-window.tsx

import React, { createContext, useContext } from "react";

interface ServerContextType {
  baseUrl: string;
}

const ServerContext = createContext<ServerContextType>({
  baseUrl: "",
});

interface ServerProviderProps {
  children: React.ReactNode;
}

export const ServerProvider: React.FC<ServerProviderProps> = ({ children }) => {
  const baseUrl = import.meta.env.DEV
    ? "http://localhost:1234"
    : "https://app.hyprnote.com";

  return (
    <ServerContext.Provider value={{ baseUrl }}>
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
