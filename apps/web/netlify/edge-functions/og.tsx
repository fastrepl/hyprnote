// deno-lint-ignore no-unused-vars no-import-prefix
import React from "https://esm.sh/react@18.2.0";
// deno-lint-ignore no-import-prefix
import { ImageResponse } from "https://deno.land/x/og_edge@0.0.6/mod.ts";
// deno-lint-ignore no-import-prefix
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const templateSchema = z.object({
  type: z.literal("meeting"),
  title: z.string(),
  headers: z.array(z.string()),
});

const OGSchema = z.discriminatedUnion("type", [templateSchema]);

function parseSearchParams(url: URL): z.infer<typeof OGSchema> | null {
  const type = url.searchParams.get("type");
  if (!type) {
    return null;
  }

  const title = url.searchParams.get("title");
  const headers = url.searchParams.getAll("headers");

  const result = OGSchema.safeParse({ type, title, headers });
  return result.success ? result.data : null;
}

function renderTemplate(params: z.infer<typeof templateSchema>) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "80px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "white",
          borderRadius: "24px",
          padding: "80px",
          width: "100%",
          height: "100%",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#1a202c",
            marginBottom: "40px",
          }}
        >
          {params.title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {params.headers.map((header, i) => (
            <div
              key={i}
              style={{
                fontSize: 28,
                color: "#4a5568",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#667eea",
                  marginRight: "16px",
                }}
              />
              {header}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function handler(req: Request) {
  const url = new URL(req.url);
  const params = parseSearchParams(url);

  if (!params) {
    return new Response(JSON.stringify({ error: "invalid_parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // https://unpic.pics/og-edge
  return new ImageResponse(renderTemplate(params));
}

// https://docs.netlify.com/build/edge-functions/declarations/#declare-edge-functions-inline
export const config = {
  path: "/og",
  cache: "manual",
};
