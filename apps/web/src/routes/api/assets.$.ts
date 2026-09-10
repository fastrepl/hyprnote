import { createFileRoute } from "@tanstack/react-router";

const PUBLIC_IMAGES_BASE_URL =
  "https://auth.hyprnote.com/storage/v1/object/public/public_images";

const BLOG_BUCKET_PUBLIC_URL =
  "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/blog";

const SAFE_SEGMENT = /^[A-Za-z0-9._+\- ]+$/;

const DEFAULT_CACHE_CONTROL = "public, max-age=31536000, immutable";

// Supabase sends `max-age=undefined` for objects uploaded without an explicit
// cacheControl, which browsers reject and treat as uncacheable. Only forward an
// upstream value when it actually parses.
function getCacheControl(upstream: string | null) {
  if (!upstream) return DEFAULT_CACHE_CONTROL;

  const maxAge = upstream.match(/max-age=([^,\s]+)/i)?.[1];
  if (maxAge && !/^\d+$/.test(maxAge)) {
    return DEFAULT_CACHE_CONTROL;
  }

  return upstream;
}

function sanitizePath(raw: string | undefined): string[] | null {
  if (!raw) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }

  if (decoded.startsWith("/") || decoded.includes("\\")) {
    return null;
  }

  const segments = decoded.split("/");
  if (segments.length === 0) return null;

  for (const segment of segments) {
    if (!segment) return null;
    if (segment === "." || segment === "..") return null;
    if (!SAFE_SEGMENT.test(segment)) return null;
  }

  return segments;
}

function encodePath(segments: string[]) {
  return segments.map((segment) => encodeURIComponent(segment)).join("/");
}

function getPublicImagesUrl(segments: string[]) {
  return `${PUBLIC_IMAGES_BASE_URL}/${encodePath(segments)}`;
}

export const Route = createFileRoute("/api/assets/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const sanitizedPath = sanitizePath(params._splat);

        if (!sanitizedPath) {
          return new Response("Not found", { status: 404 });
        }

        // Netlify redirects this at the edge in production. Keep the app-level
        // redirect for local development and non-Netlify deployments.
        const [namespace, ...pathSegments] = sanitizedPath;
        if (namespace === "blog") {
          if (pathSegments.length === 0) {
            return new Response("Not found", { status: 404 });
          }

          const location = new URL(
            `${BLOG_BUCKET_PUBLIC_URL}/${encodePath(pathSegments)}`,
          );
          return Response.redirect(location, 301);
        }

        const response = await fetch(getPublicImagesUrl(sanitizedPath));

        if (!response.ok) {
          if (response.status === 404) {
            return new Response("Not found", { status: 404 });
          }

          return new Response("Upstream service error", {
            status: 502,
          });
        }

        const contentType = response.headers.get("content-type");

        const headers: HeadersInit = {
          "Cache-Control": getCacheControl(
            response.headers.get("cache-control"),
          ),
        };
        if (contentType) {
          headers["Content-Type"] = contentType;
        }

        return new Response(response.body, {
          status: 200,
          headers,
        });
      },
    },
  },
});
