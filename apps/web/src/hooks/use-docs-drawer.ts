import { createContext, useContext } from "react";

interface DocsDrawerContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const DocsDrawerContext = createContext<DocsDrawerContextType | null>(
  null,
);

export function useDocsDrawer() {
  return useContext(DocsDrawerContext);
}
