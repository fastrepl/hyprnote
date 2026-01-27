import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createFileRoute } from "@tanstack/react-router";

import { env } from "../../../env";

function getS3Client() {
  return new S3Client({
    region: "auto",
    endpoint: env.CLOUDFLARE_R2_ENDPOINT_URL,
    credentials: {
      accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  });
}

export const Route = createFileRoute("/api/download/staging-dmg")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const s3Client = getS3Client();
          const command = new GetObjectCommand({
            Bucket: "hyprnote-build",
            Key: "desktop/staging/hyprnote-macos-aarch64.dmg",
          });

          const response = await s3Client.send(command);

          if (!response.Body) {
            return new Response("File not found", { status: 404 });
          }

          const headers = new Headers({
            "Content-Type": "application/octet-stream",
            "Content-Disposition":
              "attachment; filename=hyprnote-macos-aarch64.dmg",
            "Cache-Control": "public, max-age=300",
          });

          if (response.ContentLength) {
            headers.set("Content-Length", response.ContentLength.toString());
          }

          return new Response(response.Body.transformToWebStream(), {
            status: 200,
            headers,
          });
        } catch (error) {
          console.error("Error fetching DMG from R2:", error);
          return new Response("Failed to fetch file", { status: 500 });
        }
      },
    },
  },
});
