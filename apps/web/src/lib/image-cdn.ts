import { IMAGE_SIZES } from "./image-sizes.ts";

// Remote hosts must also be listed in the image domains of vercel-build-config.ts.
export function canResize(src: string) {
  return (
    ((src.startsWith("/") &&
      !src.startsWith("//") &&
      !src.startsWith("/_vercel/") &&
      !src.startsWith("/.netlify/")) ||
      src.startsWith("https://static.anarlog.so/") ||
      src.startsWith("https://static.fastrepl.com/anarlog/")) &&
    !/\.(svg|gif)(?:$|[?#])/i.test(src)
  );
}

export function getResizedImageUrl(
  src: string,
  { width }: { width: number; height?: number },
) {
  if (!canResize(src)) return src;

  const size = IMAGE_SIZES.find((size) => size >= width) ?? IMAGE_SIZES.at(-1)!;
  const params = new URLSearchParams({ url: src, w: String(size), q: "75" });
  return `/_vercel/image?${params}`;
}

export function getResizedImageSrcSet(src: string, size: number) {
  if (!canResize(src)) return undefined;
  return [1, 2]
    .map((dpr) => `${getResizedImageUrl(src, { width: size * dpr })} ${dpr}x`)
    .join(", ");
}
