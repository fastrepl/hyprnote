import { createFileRoute } from "@tanstack/react-router";

import { env } from "@/env";

const GITHUB_REPO = "fastrepl/hyprnote";
const GITHUB_BRANCH = "main";
const ALLOWED_FOLDERS = [
  "apps/web/public/images",
  "apps/web/public/images/blog",
  "apps/web/public/images/handbook",
];

export const Route = createFileRoute("/api/media-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const githubToken = env.YUJONGLEE_GITHUB_TOKEN_REPO;
        if (!githubToken) {
          return new Response(
            JSON.stringify({ error: "GitHub token not configured" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        let body: { filename: string; content: string; folder: string };
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { filename, content, folder } = body;

        if (!filename || !content || !folder) {
          return new Response(
            JSON.stringify({
              error: "Missing required fields: filename, content, folder",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (!ALLOWED_FOLDERS.includes(folder)) {
          return new Response(JSON.stringify({ error: "Invalid folder" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const sanitizedFilename = filename
          .replace(/[^a-zA-Z0-9.-]/g, "-")
          .toLowerCase();
          
        const allowedExtensions = ["jpg", "jpeg", "png", "gif", "svg", "webp", "avif"];
        const ext = sanitizedFilename.toLowerCase().split(".").pop();

        if (!ext || !allowedExtensions.includes(ext)) {
          return new Response(
            JSON.stringify({ error: "Invalid file type. Only images are allowed." }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        
        const path = `${folder}/${sanitizedFilename}`;

        try {
          // Check if file already exists
          const checkResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
            {
              method: "GET",
              headers: {
                Authorization: `token ${githubToken}`,
                Accept: "application/vnd.github.v3+json",
              },
            },
          );

          let sha: string | undefined;
          if (checkResponse.ok) {
            const existing = await checkResponse.json();
            sha = existing.sha;
          }

          const response = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
            {
              method: "PUT",
              headers: {
                Authorization: `token ${githubToken}`,
                "Content-Type": "application/json",
                Accept: "application/vnd.github.v3+json",
              },
              body: JSON.stringify({
                message: `Upload ${sanitizedFilename} via Decap CMS`,
                content,
                branch: GITHUB_BRANCH,
                ...(sha && { sha }), // Include sha if file exists
              }),
            },
          );

          if (!response.ok) {
            const error = await response.json();
            return new Response(
              JSON.stringify({
                error: error.message || `GitHub API error: ${response.status}`,
              }),
              {
                status: response.status,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const result = await response.json();
          const publicPath = path.replace("apps/web/public", "");

          return new Response(
            JSON.stringify({
              success: true,
              path: publicPath,
              url: result.content.download_url,
              name: sanitizedFilename,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              error: `Upload failed: ${(error as Error).message}`,
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
