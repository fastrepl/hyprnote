export type WsPayload = string | Uint8Array;

// https://bun.com/docs/runtime/http/websockets
export const normalizeWsData = async (
  data: unknown,
): Promise<WsPayload | null> => {
  if (typeof data === "string") {
    return data;
  }

  if (data instanceof Uint8Array) {
    return cloneBinaryPayload(data);
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  if (ArrayBuffer.isView(data)) {
    return cloneBinaryPayload(data);
  }

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    const arrayBuffer = await data.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  return null;
};

export const buildDeepgramUrl = (incomingUrl: URL) => {
  const target = new URL("wss://api.deepgram.com/v1/listen");

  incomingUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });
  target.searchParams.set("mip_opt_out", "false");

  return target;
};

const cloneBinaryPayload = (input: ArrayBuffer | ArrayBufferView) => {
  const view =
    input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy;
};
