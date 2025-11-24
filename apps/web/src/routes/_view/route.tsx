import {
  createFileRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { createContext, useContext, useState } from "react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export const Route = createFileRoute("/_view")({
  component: Component,
  loader: async ({ context }) => ({ user: context.user }),
});

interface HeroContextType {
  onTrigger: (() => void) | null;
  setOnTrigger: (callback: () => void) => void;
}

const HeroContext = createContext<HeroContextType | null>(null);

export function useHeroContext() {
  return useContext(HeroContext);
}

function Component() {
  const router = useRouterState();
  const isDocsPage = router.location.pathname.startsWith("/docs");
  const [onTrigger, setOnTrigger] = useState<(() => void) | null>(null);

  return (
    <HeroContext.Provider
      value={{
        onTrigger,
        setOnTrigger: (callback) => setOnTrigger(() => callback),
      }}
    >
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        {!isDocsPage && <Footer />}
      </div>
    </HeroContext.Provider>
  );
}
