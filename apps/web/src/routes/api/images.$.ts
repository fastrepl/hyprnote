import { createFileRoute } from "@tanstack/react-router";

const SUPABASE_STORAGE_URL =
  "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images";

const SAFE_SEGMENT = /^[A-Za-z0-9._+-]+$/;

function sanitizePath(raw: string | undefined): string | null {
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

  return segments.join("/");
}

export const Route = createFileRoute("/api/images/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const sanitizedPath = sanitizePath(params._splat);

        if (!sanitizedPath) {
          return new Response("Not found", { status: 404 });
        }

        const url = `${SUPABASE_STORAGE_URL}/${sanitizedPath}`;

        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 404) {
            return new Response("Not found", { status: 404 });
          }
          return new Response("Upstream service error", { status: 502 });
        }

        const contentType = response.headers.get("content-type");
        const cacheControl = response.headers.get("cache-control");

        const headers: HeadersInit = {};
        if (contentType) {
          headers["Content-Type"] = contentType;
        }
        if (cacheControl) {
          headers["Cache-Control"] = cacheControl;
        } else {
          headers["Cache-Control"] = "public, max-age=31536000, immutable";
        }

        return new Response(response.body, {
          status: 200,
          headers,
        });
      },
    },
  },
});
