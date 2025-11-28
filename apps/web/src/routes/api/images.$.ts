import { createFileRoute } from "@tanstack/react-router";

const SUPABASE_STORAGE_URL =
  "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images";

export const Route = createFileRoute("/api/images/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat;

        if (!path) {
          return new Response("Not found", { status: 404 });
        }

        const url = `${SUPABASE_STORAGE_URL}/${path}`;

        const response = await fetch(url);

        if (!response.ok) {
          return new Response("Not found", { status: response.status });
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
