import { createContext, type ReactNode, useContext, useMemo } from "react";

import { type Brand, BRANDING, detectBrand } from "@/lib/branding";

interface BrandingContextValue {
  brand: Brand;
  logo: string;
  productName: string;
  domain: string;
  twitterHandle: string;
  ogImage: string;
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

  const value = useMemo(
    () => ({
      brand,
      logo: branding.logo,
      productName: branding.productName,
      domain: branding.domain,
      twitterHandle: branding.twitterHandle,
      ogImage: branding.ogImage,
    }),
    [brand, branding],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

/**
 * Hook to access branding configuration.
 *
 * Returns an object with stable primitive values. Components only re-render
 * when the brand changes, not on every context update. Destructure only the
 * values you need:
 *
 * @example
 * const { logo, productName } = useBranding();
 */
export function useBranding(): BrandingContextValue {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within BrandingProvider");
  }
  return context;
}
