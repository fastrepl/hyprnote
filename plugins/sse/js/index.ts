import {
  commands as generatedCommands,
  events as generatedEvents,
} from "./bindings.gen";

export const commands = {
  async fetch(
    input: Parameters<typeof globalThis.fetch>[0],
    init?: Parameters<typeof globalThis.fetch>[1],
  ): Promise<Response> {
    // @ts-ignore
    if (window.__TAURI__) {
      return window.fetch(input, init);
    }

    const {
      signal,
      method = "GET",
      headers: _headers = {},
      body = [],
    } = init || {};

    let unlisten: Function | undefined;
    let setRequestId: Function | undefined;
    const requestIdPromise = new Promise((resolve) => (setRequestId = resolve));
    const ts = new TransformStream();
    const writer = ts.writable.getWriter();

    let closed = false;
    const close = () => {
      if (closed) {
        return;
      }

      closed = true;
      unlisten && unlisten();
      
      writer.ready.then(() => {
        writer.close().catch((e) => console.error(e));
      });
    };

    if (signal) {
      signal.addEventListener("abort", () => close());
    }

    generatedEvents.serverSentEvent.listen((e) => {
      requestIdPromise.then((currentRequestId) => {
        const { requestId, chunk } = e?.payload || {};
        if (currentRequestId != requestId) {
          return;
        }
        if (chunk) {
          writer.ready.then(() => {
            writer.write(new Uint8Array(chunk));
          });
        } else {
          close();
        }
      });
    });

    return generatedCommands
      .fetch({
        method,
        url: input.toString(),
        headers: Object.fromEntries(Object.entries(_headers)),
        body:
          typeof body === "string"
            ? Array.from(new TextEncoder().encode(body))
            : [],
      })
      .then((res) => {
        return new Response(ts.readable, {
          status: res.status,
          headers: new Headers(res.headers as Record<string, string>),
        });
      });
  },
};
