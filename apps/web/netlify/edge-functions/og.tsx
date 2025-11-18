// deno-lint-ignore no-import-prefix
import { ImageResponse } from "https://deno.land/x/og_edge@0.0.6/mod.ts";

export default function handler(req: Request) {
  const url = new URL(req.url);
  const title = url.searchParams.get("title") || "Hyprnote";
  const description = url.searchParams.get("description") || "AI Meeting Notes";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "white",
            borderRadius: "24px",
            padding: "80px",
            width: "100%",
            height: "100%",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#1a202c",
              textAlign: "center",
              marginBottom: "24px",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#718096",
              textAlign: "center",
            }}
          >
            {description}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: "80px",
              fontSize: 36,
              fontWeight: 700,
              color: "#667eea",
            }}
          >
            Hyprnote
          </div>
        </div>
      </div>
    ),
  );
}

export const config = {
  path: "/og",
  cache: "manual",
};
