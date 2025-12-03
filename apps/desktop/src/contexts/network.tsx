import { createContext, useContext, useEffect, useState } from "react";

import { events } from "@hypr/plugin-network";

interface NetworkContextValue {
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    events.networkStatusEvent
      .listen(({ payload }) => {
        setIsOnline(payload.is_online);
      })
      .then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unlisten = fn;
        }
      })
      .catch((err) => {
        console.error("Failed to setup network status event listener:", err);
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextValue {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}
