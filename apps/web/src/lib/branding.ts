/**
 * Branding System
 *
 * This module provides domain-based branding configuration.
 */

export type Brand = "hyprnote" | "char";

export interface BrandingConfig {
  logo: string;
  productName: string;
  domain: string;
  twitterHandle: string;
  ogImage: string;
}

export const BRANDING: Record<Brand, BrandingConfig> = {
  hyprnote: {
    logo: "/api/images/hyprnote/logo.svg",
    productName: "Hyprnote",
    domain: "hyprnote.com",
    twitterHandle: "@tryhyprnote",
    ogImage: "/api/images/hyprnote/og-image.jpg",
  },
  char: {
    logo: "/api/images/char/logo.svg",
    productName: "Char",
    domain: "char.com",
    twitterHandle: "@trychar",
    ogImage: "/api/images/char/og-image.jpg",
  },
};

/**
 * Detect brand from hostname - works server-side and client-side
 */
export function detectBrand(hostname: string): Brand {
  const normalized = hostname.toLowerCase();

  if (normalized.includes("char.com")) {
    return "char";
  }

  // Default to hyprnote (including localhost, staging, etc.)
  return "hyprnote";
}

/**
 * Get branding config from hostname
 */
export function getBrandingFromHostname(hostname: string): BrandingConfig {
  const brand = detectBrand(hostname);
  return BRANDING[brand];
}

/**
 * Get current hostname - works in browser only
 * Returns empty string on server (use request URL instead)
 */
export function getCurrentHostname(): string {
  if (typeof window !== "undefined") {
    return window.location.hostname;
  }
  return "";
}
