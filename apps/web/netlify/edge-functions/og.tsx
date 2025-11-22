// deno-lint-ignore no-import-prefix no-unused-vars
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

const changelogSchema = z.object({
  type: z.literal("changelog"),
  version: z.string(),
  isNightly: z.boolean().optional().default(false),
});

const OGSchema = z.discriminatedUnion("type", [templateSchema, changelogSchema]);

function parseSearchParams(url: URL): z.infer<typeof OGSchema> | null {
  const type = url.searchParams.get("type");
  if (!type) {
    return null;
  }

  if (type === "changelog") {
    const version = url.searchParams.get("version");
    const isNightly = url.searchParams.get("isNightly") === "true";

    const result = OGSchema.safeParse({ type, version, isNightly });
    return result.success ? result.data : null;
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

function renderChangelogTemplate(params: z.infer<typeof changelogSchema>) {
  const background = params.isNightly
    ? "linear-gradient(180deg, #03BCF1 0%, #127FE5 100%)"
    : "linear-gradient(180deg, #A8A29E 0%, #57534E 100%)";

  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        background,
        position: "relative",
      }}
    >
      {/* Header section */}
      <div
        style={{
          position: "absolute",
          left: "56px",
          top: "58px",
          right: "56px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {/* Left: Hyprnote Changelog */}
        <div
          style={{
            fontFamily: "Lora, serif",
            fontWeight: 700,
            fontSize: "40px",
            color: "#FAFAF9",
            whiteSpace: "nowrap",
          }}
        >
          Hyprnote Changelog
        </div>

        {/* Center: Line */}
        <div
          style={{
            flex: 1,
            height: "2px",
            background: "rgba(255, 255, 255, 0.3)",
          }}
        />

        {/* Right: Version */}
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 400,
            fontSize: "39px",
            color: "#F5F5F4",
            whiteSpace: "nowrap",
          }}
        >
          {params.version}
        </div>
      </div>

      {/* Image section */}
      <div
        style={{
          position: "absolute",
          left: "56px",
          top: "157px",
          width: "1088px",
          height: "707px",
          display: "flex",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
          }}
        >
          {/* Shadow layer */}
          <div
            style={{
              position: "absolute",
              left: "22px",
              top: "22px",
              width: "1088px",
              height: "707px",
              background: "rgba(0, 0, 0, 0.15)",
              filter: "blur(15px)",
            }}
          />
          {/* Image */}
          <img
            src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/app/mock-hyprnote.png"
            style={{
              position: "absolute",
              left: "0",
              top: "0",
              width: "1088px",
              height: "707px",
              objectFit: "cover",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default async function handler(req: Request) {
  const url = new URL(req.url);

  // Disable in development to avoid WASM loading issues
  if (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    Deno.env.get("CONTEXT") === "dev"
  ) {
    return new Response("OG image generation disabled in dev", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const params = parseSearchParams(url);

  if (!params) {
    return new Response(JSON.stringify({ error: "invalid_parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // https://unpic.pics/og-edge
    let response;
    if (params.type === "changelog") {
      response = renderChangelogTemplate(params);
    } else {
      response = renderTemplate(params);
    }

    const fonts = params.type === "changelog"
      ? [
        {
          name: "Lora",
          data: await fetch(
            "https://fonts.gstatic.com/s/lora/v37/0QI6MX1D_JOuGQbT0gvTJPa787z5vCJG.ttf"
          ).then((res) => res.arrayBuffer()),
          weight: 700,
          style: "normal",
        },
        {
          name: "IBM Plex Mono",
          data: await fetch(
            "https://fonts.gstatic.com/s/ibmplexmono/v20/-F63fjptAgt5VM-kVkqdyU8n5ig.ttf"
          ).then((res) => res.arrayBuffer()),
          weight: 400,
          style: "normal",
        },
      ]
      : undefined;

    return new ImageResponse(response, { fonts });
  } catch (error) {
    console.error("OG image generation failed:", error);
    return new Response(JSON.stringify({ error: "image_generation_failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// https://docs.netlify.com/build/edge-functions/declarations/#declare-edge-functions-inline
export const config = {
  path: "/og",
  cache: "manual",
  excludedPath: Deno.env.get("CONTEXT") === "dev" ? "/og" : undefined,
};
