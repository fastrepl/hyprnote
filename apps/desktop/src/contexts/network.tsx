import React, { createContext, useContext, useEffect, useState } from "react";

import { commands, events } from "@hypr/plugin-network";

interface NetworkContextValue {
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export const NetworkProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    commands
      .isOnline()
      .then((result) => {
        if (result.status === "ok") {
          setIsOnline(result.data);
        } else {
          console.error("Failed to check network status:", result.error);
          setIsOnline(false);
        }
      })
      .catch((err) => {
        console.error("Failed to check network status:", err);
        setIsOnline(false);
      });
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    events.networkEvent
      .listen(({ payload }) => {
        if (payload.type === "statusChanged") {
          setIsOnline(payload.is_online);
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unlisten = fn;
        }
      })
      .catch((err) => {
        console.error("Failed to setup network event listener:", err);
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
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);

  if (!context) {
    throw new Error("'useNetwork' must be used within a 'NetworkProvider'");
  }

  return context;
};
