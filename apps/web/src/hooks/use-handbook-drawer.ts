import { createContext, useContext } from "react";

interface HandbookDrawerContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const HandbookDrawerContext =
  createContext<HandbookDrawerContextType | null>(null);

export function useHandbookDrawer() {
  return useContext(HandbookDrawerContext);
}
