import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { describe, expect, test, vi } from "vitest";

import { listGenericModels, processGenericModels } from "./list-openai";

vi.mock("@tauri-apps/plugin-http", () => ({ fetch: vi.fn() }));

test("discovers models from an authenticated local provider that rejects foreign origins", async () => {
  vi.mocked(tauriFetch).mockImplementation(async (_input, init) => {
    const headers = new Headers(init?.headers);
    if (headers.get("Origin") !== "")
      return new Response(null, { status: 403 });
    if (headers.get("Authorization") !== "Bearer local-key")
      return new Response(null, { status: 401 });
    return Response.json({
      data: [{ id: "mtplx-qwen38-27b-optimized-quality" }],
    });
  });

  const result = await listGenericModels(
    "http://127.0.0.1:8000/v1",
    "local-key",
  );
  expect(result.models).toEqual(["mtplx-qwen38-27b-optimized-quality"]);
});

describe("processGenericModels", () => {
  test("lists Meta Muse Spark models with the current release first", () => {
    const result = processGenericModels([
      { id: "muse-spark-1.3-contributor" },
      { id: "muse-voice-transcribe-1.0" },
      { id: "muse-spark-1.3" },
      { id: "muse-image-1.0" },
      { id: "muse-spark-1.2-contributor" },
      { id: "muse-spark-1.2" },
      { id: "muse-spark-1.1" },
    ]);

    expect(result.models).toEqual([
      "muse-spark-1.3",
      "muse-spark-1.1",
      "muse-spark-1.2",
      "muse-spark-1.2-contributor",
      "muse-spark-1.3-contributor",
    ]);
    expect(result.ignored.map(({ id }) => id)).toEqual([
      "muse-voice-transcribe-1.0",
      "muse-image-1.0",
    ]);
  });

  test("keeps Cohere model versions while still filtering non-chat models", () => {
    const result = processGenericModels(
      [{ id: "command-a-plus-05-2026" }, { id: "embed-v4.0" }],
      { filterDateSnapshots: false },
    );

    expect(result.models).toEqual(["command-a-plus-05-2026"]);
    expect(result.ignored).toEqual([
      { id: "embed-v4.0", reasons: ["common_keyword"] },
    ]);
  });

  test("filters date snapshots by default for generic providers", () => {
    const result = processGenericModels([{ id: "model-05-2026" }]);

    expect(result.models).toEqual([]);
    expect(result.ignored).toEqual([
      { id: "model-05-2026", reasons: ["date_snapshot"] },
    ]);
  });

  test("filters dotted Bedrock model IDs by their model name", () => {
    const result = processGenericModels([
      { id: "anthropic.claude-opus-4.7" },
      { id: "google.gemma-3-27b-it" },
      { id: "anthropic.claude-opus-5" },
    ]);

    expect(result.models).toEqual([
      "anthropic.claude-opus-5",
      "google.gemma-3-27b-it",
    ]);
    expect(result.ignored).toEqual([
      { id: "anthropic.claude-opus-4.7", reasons: ["old_model"] },
    ]);
  });
});
