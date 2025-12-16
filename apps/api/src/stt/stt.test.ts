import { beforeAll, describe, expect, mock, test } from "bun:test";

import {
  getPayloadSize,
  normalizeWsData,
  payloadIsControlMessage,
} from "./utils";

mock.module("../env", () => ({
  env: {
    DEEPGRAM_API_KEY: "test-deepgram-key",
    ASSEMBLYAI_API_KEY: "test-assemblyai-key",
    SONIOX_API_KEY: "test-soniox-key",
  },
}));

let buildDeepgramUrl: typeof import("./deepgram").buildDeepgramUrl;
let buildAssemblyAIUrl: typeof import("./assemblyai").buildAssemblyAIUrl;
let buildSonioxUrl: typeof import("./soniox").buildSonioxUrl;

beforeAll(async () => {
  const deepgram = await import("./deepgram");
  const assemblyai = await import("./assemblyai");
  const soniox = await import("./soniox");

  buildDeepgramUrl = deepgram.buildDeepgramUrl;
  buildAssemblyAIUrl = assemblyai.buildAssemblyAIUrl;
  buildSonioxUrl = soniox.buildSonioxUrl;
});

describe("normalizeWsData", () => {
  test("returns string as-is", async () => {
    const result = await normalizeWsData("hello");
    expect(result).toBe("hello");
  });

  test("returns empty string as-is", async () => {
    const result = await normalizeWsData("");
    expect(result).toBe("");
  });

  test("clones Uint8Array", async () => {
    const original = new Uint8Array([1, 2, 3]);
    const result = await normalizeWsData(original);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result).toEqual(new Uint8Array([1, 2, 3]));
    expect(result).not.toBe(original);
  });

  test("converts ArrayBuffer to Uint8Array", async () => {
    const buffer = new ArrayBuffer(3);
    const view = new Uint8Array(buffer);
    view.set([4, 5, 6]);
    const result = await normalizeWsData(buffer);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result).toEqual(new Uint8Array([4, 5, 6]));
  });

  test("converts ArrayBufferView to Uint8Array", async () => {
    const buffer = new ArrayBuffer(4);
    const int16View = new Int16Array(buffer);
    int16View[0] = 256;
    int16View[1] = 512;
    const result = await normalizeWsData(int16View);
    expect(result).toBeInstanceOf(Uint8Array);
    expect((result as Uint8Array).byteLength).toBe(4);
  });

  test("converts Blob to Uint8Array", async () => {
    const blob = new Blob([new Uint8Array([7, 8, 9])]);
    const result = await normalizeWsData(blob);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result).toEqual(new Uint8Array([7, 8, 9]));
  });

  test("returns null for unsupported types", async () => {
    expect(await normalizeWsData(null)).toBeNull();
    expect(await normalizeWsData(undefined)).toBeNull();
    expect(await normalizeWsData(123)).toBeNull();
    expect(await normalizeWsData({ foo: "bar" })).toBeNull();
    expect(await normalizeWsData([1, 2, 3])).toBeNull();
  });
});

describe("getPayloadSize", () => {
  test("returns byte length for string", () => {
    expect(getPayloadSize("hello")).toBe(5);
    expect(getPayloadSize("")).toBe(0);
  });

  test("handles multi-byte characters", () => {
    expect(getPayloadSize("héllo")).toBe(6);
    expect(getPayloadSize("日本語")).toBe(9);
    expect(getPayloadSize("🎉")).toBe(4);
  });

  test("returns byteLength for Uint8Array", () => {
    expect(getPayloadSize(new Uint8Array([1, 2, 3]))).toBe(3);
    expect(getPayloadSize(new Uint8Array(100))).toBe(100);
    expect(getPayloadSize(new Uint8Array(0))).toBe(0);
  });
});

describe("payloadIsControlMessage", () => {
  const controlTypes = new Set(["keepalive", "finalize"]);

  test("returns false for binary payload", () => {
    expect(
      payloadIsControlMessage(new Uint8Array([1, 2, 3]), controlTypes),
    ).toBe(false);
  });

  test("returns false for non-JSON string", () => {
    expect(payloadIsControlMessage("not json", controlTypes)).toBe(false);
  });

  test("returns false for JSON without type field", () => {
    expect(payloadIsControlMessage('{"foo": "bar"}', controlTypes)).toBe(false);
  });

  test("returns false for unrecognized type", () => {
    expect(payloadIsControlMessage('{"type": "unknown"}', controlTypes)).toBe(
      false,
    );
  });

  test("returns true for recognized control message type", () => {
    expect(payloadIsControlMessage('{"type": "keepalive"}', controlTypes)).toBe(
      true,
    );
    expect(payloadIsControlMessage('{"type": "finalize"}', controlTypes)).toBe(
      true,
    );
  });

  test("returns true with additional fields present", () => {
    expect(
      payloadIsControlMessage(
        '{"type": "keepalive", "extra": 123}',
        controlTypes,
      ),
    ).toBe(true);
  });

  test("returns false with empty control types set", () => {
    const empty = new Set<string>();
    expect(payloadIsControlMessage('{"type": "keepalive"}', empty)).toBe(false);
  });

  test("returns false for array JSON", () => {
    expect(payloadIsControlMessage("[1, 2, 3]", controlTypes)).toBe(false);
  });

  test("returns false for primitive JSON", () => {
    expect(payloadIsControlMessage("null", controlTypes)).toBe(false);
    expect(payloadIsControlMessage("true", controlTypes)).toBe(false);
    expect(payloadIsControlMessage("123", controlTypes)).toBe(false);
  });
});

describe("buildDeepgramUrl", () => {
  test("returns deepgram listen endpoint", () => {
    const incoming = new URL("wss://example.com/stt");
    const result = buildDeepgramUrl(incoming);
    expect(result.origin).toBe("wss://api.deepgram.com");
    expect(result.pathname).toBe("/v1/listen");
  });

  test("copies query params from incoming URL", () => {
    const incoming = new URL("wss://example.com/stt?language=en&encoding=pcm");
    const result = buildDeepgramUrl(incoming);
    expect(result.searchParams.get("language")).toBe("en");
    expect(result.searchParams.get("encoding")).toBe("pcm");
  });

  test("excludes provider param", () => {
    const incoming = new URL("wss://example.com/stt?provider=deepgram&lang=en");
    const result = buildDeepgramUrl(incoming);
    expect(result.searchParams.has("provider")).toBe(false);
    expect(result.searchParams.get("lang")).toBe("en");
  });

  test("sets default model and mip_opt_out", () => {
    const incoming = new URL("wss://example.com/stt");
    const result = buildDeepgramUrl(incoming);
    expect(result.searchParams.get("model")).toBe("nova-3-general");
    expect(result.searchParams.get("mip_opt_out")).toBe("false");
  });

  test("overrides model param with default", () => {
    const incoming = new URL("wss://example.com/stt?model=custom");
    const result = buildDeepgramUrl(incoming);
    expect(result.searchParams.get("model")).toBe("nova-3-general");
  });
});

describe("buildAssemblyAIUrl", () => {
  test("returns assemblyai streaming endpoint", () => {
    const incoming = new URL("wss://example.com/stt");
    const result = buildAssemblyAIUrl(incoming);
    expect(result.origin).toBe("wss://streaming.assemblyai.com");
    expect(result.pathname).toBe("/v3/ws");
  });

  test("copies query params from incoming URL", () => {
    const incoming = new URL(
      "wss://example.com/stt?sample_rate=16000&encoding=pcm",
    );
    const result = buildAssemblyAIUrl(incoming);
    expect(result.searchParams.get("sample_rate")).toBe("16000");
    expect(result.searchParams.get("encoding")).toBe("pcm");
  });

  test("excludes provider param", () => {
    const incoming = new URL(
      "wss://example.com/stt?provider=assemblyai&format=json",
    );
    const result = buildAssemblyAIUrl(incoming);
    expect(result.searchParams.has("provider")).toBe(false);
    expect(result.searchParams.get("format")).toBe("json");
  });
});

describe("buildSonioxUrl", () => {
  test("returns soniox transcribe endpoint", () => {
    const result = buildSonioxUrl();
    expect(result.origin).toBe("wss://stt-rt.soniox.com");
    expect(result.pathname).toBe("/transcribe-websocket");
  });

  test("returns URL with no query params", () => {
    const result = buildSonioxUrl();
    expect(result.search).toBe("");
  });
});
