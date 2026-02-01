import { createContext, type ReactNode, useContext } from "react";

import {
  type Brand,
  BRANDING,
  type BrandingConfig,
  detectBrand,
} from "@/lib/feature-flags";

interface BrandingContextValue {
  brand: Brand;
  branding: BrandingConfig;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

interface BrandingProviderProps {
  hostname: string;
  children: ReactNode;
}

/**
 * Provides branding configuration based on the current domain.
 * Should be initialized with the hostname from the request or window.location.
 */
export function BrandingProvider({
  hostname,
  children,
}: BrandingProviderProps) {
  const brand = detectBrand(hostname);
  const branding = BRANDING[brand];

  return (
    <BrandingContext.Provider value={{ brand, branding }}>
      {children}
    </BrandingContext.Provider>
  );
}

/**
 * Hook to access the current brand identifier
 */
export function useBrand(): Brand {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBrand must be used within BrandingProvider");
  }
  return context.brand;
}

/**
 * Hook to access the full branding configuration
 */
export function useBranding(): BrandingConfig {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within BrandingProvider");
  }
  return context.branding;
}

/**
 * Hook to check if the current brand is Char
 */
export function useIsCharBrand(): boolean {
  const brand = useBrand();
  return brand === "char";
}
