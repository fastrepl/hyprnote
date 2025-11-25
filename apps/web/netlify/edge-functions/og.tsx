// deno-lint-ignore no-import-prefix no-unused-vars
import React from "https://esm.sh/react@18.2.0";
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
});

const blogSchema = z.object({
  type: z.literal("blog"),
  title: z.string(),
  description: z.string().optional(),
});

const docsSchema = z.object({
  type: z.literal("docs"),
  title: z.string(),
  description: z.string().optional(),
});

const OGSchema = z.discriminatedUnion("type", [templateSchema, changelogSchema, blogSchema, docsSchema]);

function preventWidow(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= 2) return text;

  const last = words.pop()!;
  const secondLast = words.pop()!;
  const lastChunk = `${secondLast}\u00A0${last}`;

  return [...words, lastChunk].join(" ");
}

function parseSearchParams(url: URL): z.infer<typeof OGSchema> | null {
  const type = url.searchParams.get("type");
  if (!type) {
    return null;
  }

  if (type === "changelog") {
    const version = url.searchParams.get("version");

    const result = OGSchema.safeParse({ type, version });
    return result.success ? result.data : null;
  }

  if (type === "blog") {
    const title = url.searchParams.get("title");
    const description = url.searchParams.get("description") || undefined;

    const result = OGSchema.safeParse({ type, title, description });
    return result.success ? result.data : null;
  }

  if (type === "docs") {
    const title = url.searchParams.get("title");
    const description = url.searchParams.get("description") || undefined;

    const result = OGSchema.safeParse({ type, title, description });
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
  const isNightly = params.version.includes("nightly");

  if (isNightly) {
    return (
      <div style={{width: '100%', height: '100%', position: 'relative', background: 'linear-gradient(180deg, #03BCF1 0%, #127FE5 100%), linear-gradient(0deg, #FAFAF9 0%, #E7E5E4 100%)', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
          <div style={{left: 56, top: 436, position: 'absolute', color: '#FAFAF9', fontSize: 60, fontFamily: 'Lora', fontWeight: '700', wordWrap: 'break-word', display: 'flex'}}>Changelog</div>
          <div style={{left: 56, top: 513, position: 'absolute', color: '#F5F5F4', fontSize: 48, fontFamily: 'IBM Plex Mono', fontWeight: '400', wordWrap: 'break-word', display: 'flex'}}>v.{params.version}</div>
          <div style={{left: 56.25, top: 61.12, position: 'absolute', color: '#F5F5F4', fontSize: 40, fontFamily: 'Lora', fontWeight: '400', wordWrap: 'break-word', display: 'flex'}}>The AI notepad for private meetings</div>
          <div style={{left: 903, top: 55, position: 'absolute', textAlign: 'right', color: '#FAFAF9', fontSize: 50, fontFamily: 'Lora', fontWeight: '700', wordWrap: 'break-word', display: 'flex'}}>Hyprnote.</div>
          <div style={{width: 140, height: 0, left: 755, top: 87, position: 'absolute', borderTop: '2px solid #F5F5F4'}}></div>
          <img style={{width: 462, height: 462, right: 57, bottom: -69, position: 'absolute'}} src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/icons/nightly-icon.png" />
      </div>
    );
  }

  return (
    <div style={{width: '100%', height: '100%', position: 'relative', background: 'linear-gradient(180deg, #A8A29E 0%, #57534E 100%)', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
        <div style={{left: 56, top: 436, position: 'absolute', color: '#FAFAF9', fontSize: 60, fontFamily: 'Lora', fontWeight: '700', wordWrap: 'break-word', display: 'flex'}}>Changelog</div>
        <div style={{left: 56, top: 513, position: 'absolute', color: '#F5F5F4', fontSize: 48, fontFamily: 'IBM Plex Mono', fontWeight: '400', wordWrap: 'break-word', display: 'flex'}}>v.{params.version}</div>
        <div style={{left: 56.25, top: 61.12, position: 'absolute', color: '#F5F5F4', fontSize: 40, fontFamily: 'Lora', fontWeight: '400', wordWrap: 'break-word', display: 'flex'}}>The AI notepad for private meetings</div>
        <div style={{left: 903, top: 55, position: 'absolute', textAlign: 'right', color: '#FAFAF9', fontSize: 50, fontFamily: 'Lora', fontWeight: '700', wordWrap: 'break-word', display: 'flex'}}>Hyprnote.</div>
        <div style={{width: 140, height: 0, left: 755, top: 87, position: 'absolute', borderTop: '2px solid #F5F5F4'}}></div>
        <img style={{width: 462, height: 462, right: 57, bottom: -69, position: 'absolute'}} src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/icons/stable-icon.png" />
    </div>
  );
}

function renderBlogTemplate(params: z.infer<typeof blogSchema>) {
  return (
    <div style={{width: '100%', height: '100%', position: 'relative', background: 'linear-gradient(180deg, #A8A29E 0%, #57534E 100%)', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
        <div style={{left: 56, top: 380, position: 'absolute', color: '#FAFAF9', fontSize: 52, fontFamily: 'Lora', fontWeight: '700', wordWrap: 'break-word', display: 'flex', maxWidth: 700, lineHeight: 1.2}}>{preventWidow(params.title)}</div>
        {params.description && (
          <div style={{left: 56, top: 500, position: 'absolute', color: '#F5F5F4', fontSize: 28, fontFamily: 'Lora', fontWeight: '400', wordWrap: 'break-word', display: 'flex', maxWidth: 700, lineHeight: 1.4}}>{params.description}</div>
        )}
        <div style={{left: 56.25, top: 61.12, position: 'absolute', color: '#F5F5F4', fontSize: 40, fontFamily: 'Lora', fontWeight: '400', wordWrap: 'break-word', display: 'flex'}}>The AI notepad for private meetings</div>
        <div style={{left: 903, top: 55, position: 'absolute', textAlign: 'right', color: '#FAFAF9', fontSize: 50, fontFamily: 'Lora', fontWeight: '700', wordWrap: 'break-word', display: 'flex'}}>Hyprnote.</div>
        <div style={{width: 140, height: 0, left: 755, top: 87, position: 'absolute', borderTop: '2px solid #F5F5F4'}}></div>
        <div style={{left: 56, top: 140, position: 'absolute', color: '#FAFAF9', fontSize: 24, fontFamily: 'IBM Plex Mono', fontWeight: '400', letterSpacing: 2, textTransform: 'uppercase', display: 'flex'}}>Blog</div>
        <img style={{width: 380, height: 380, right: 40, bottom: -40, position: 'absolute'}} src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/icons/stable-icon.png" />
    </div>
  );
}

function renderDocsTemplate(params: z.infer<typeof docsSchema>) {
  return (
    <div style={{width: '100%', height: '100%', position: 'relative', background: 'linear-gradient(180deg, #A8A29E 0%, #57534E 100%)', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
        <div style={{left: 56, top: 380, position: 'absolute', color: '#FAFAF9', fontSize: 52, fontFamily: 'Lora', fontWeight: '700', wordWrap: 'break-word', display: 'flex', maxWidth: 700, lineHeight: 1.2}}>{preventWidow(params.title)}</div>
        {params.description && (
          <div style={{left: 56, top: 500, position: 'absolute', color: '#F5F5F4', fontSize: 28, fontFamily: 'Lora', fontWeight: '400', wordWrap: 'break-word', display: 'flex', maxWidth: 700, lineHeight: 1.4}}>{params.description}</div>
        )}
        <div style={{left: 56.25, top: 61.12, position: 'absolute', color: '#F5F5F4', fontSize: 40, fontFamily: 'Lora', fontWeight: '400', wordWrap: 'break-word', display: 'flex'}}>The AI notepad for private meetings</div>
        <div style={{left: 903, top: 55, position: 'absolute', textAlign: 'right', color: '#FAFAF9', fontSize: 50, fontFamily: 'Lora', fontWeight: '700', wordWrap: 'break-word', display: 'flex'}}>Hyprnote.</div>
        <div style={{width: 140, height: 0, left: 755, top: 87, position: 'absolute', borderTop: '2px solid #F5F5F4'}}></div>
        <div style={{left: 56, top: 140, position: 'absolute', color: '#FAFAF9', fontSize: 24, fontFamily: 'IBM Plex Mono', fontWeight: '400', letterSpacing: 2, textTransform: 'uppercase', display: 'flex'}}>Documentation</div>
        <img style={{width: 380, height: 380, right: 40, bottom: -40, position: 'absolute'}} src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/icons/stable-icon.png" />
    </div>
  );
}

export default async function handler(req: Request) {
  const url = new URL(req.url);

  const params = parseSearchParams(url);

  if (!params) {
    return new Response(JSON.stringify({ error: "invalid_parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Dynamically import ImageResponse only when needed (not in dev)
    const { ImageResponse } = await import("https://deno.land/x/og_edge@0.0.6/mod.ts");

    // https://unpic.pics/og-edge
    let response;
    if (params.type === "changelog") {
      response = renderChangelogTemplate(params);
    } else if (params.type === "blog") {
      response = renderBlogTemplate(params);
    } else if (params.type === "docs") {
      response = renderDocsTemplate(params);
    } else {
      response = renderTemplate(params);
    }

    const needsCustomFonts = params.type === "changelog" || params.type === "blog" || params.type === "docs";
    const fonts = needsCustomFonts
      ? [
        {
          name: "Lora",
          data: await fetch(
            "https://fonts.gstatic.com/s/lora/v37/0QI6MX1D_JOuGQbT0gvTJPa787z5vCJG.ttf"
          ).then((res) => res.arrayBuffer()),
          weight: 700 as const,
          style: "normal" as const,
        },
        {
          name: "IBM Plex Mono",
          data: await fetch(
            "https://fonts.gstatic.com/s/ibmplexmono/v20/-F63fjptAgt5VM-kVkqdyU8n5ig.ttf"
          ).then((res) => res.arrayBuffer()),
          weight: 400 as const,
          style: "normal" as const,
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
};
