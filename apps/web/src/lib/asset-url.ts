/** Public R2 object keys include their product folder; other URLs pass through. */
export const PUBLIC_ASSET_ORIGIN = "https://static.fastrepl.com";

export function assetUrl(path: string): string {
  return /^(?:char|anarlog|fastrepl)\//.test(path)
    ? `${PUBLIC_ASSET_ORIGIN}/${path}`
    : path;
}
