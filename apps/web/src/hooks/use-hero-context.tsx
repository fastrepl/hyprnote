import { createContext, useContext } from "react";

interface HeroContextType {
  onTrigger: (() => void) | null;
  setOnTrigger: (callback: () => void) => void;
}

export const HeroContext = createContext<HeroContextType | null>(null);

export function useHeroContext() {
  return useContext(HeroContext);
}
