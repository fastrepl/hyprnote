export type WsPayload = string | Uint8Array;

const TEXT_ENCODER = new TextEncoder();

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

const cloneBinaryPayload = (input: ArrayBuffer | ArrayBufferView) => {
  const view =
    input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy;
};

export const getPayloadSize = (payload: WsPayload) => {
  if (typeof payload === "string") {
    return TEXT_ENCODER.encode(payload).byteLength;
  }
  return payload.byteLength;
};

export const payloadIsControlMessage = (
  payload: WsPayload,
  controlMessageTypes: ReadonlySet<string>,
) => {
  if (typeof payload !== "string") {
    return false;
  }

  try {
    const parsed = JSON.parse(payload);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      controlMessageTypes.has(parsed.type)
    ) {
      return true;
    }
  } catch {
    // ignore parse errors
  }

  return false;
};
