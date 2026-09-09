import assert from "node:assert/strict";
import test from "node:test";

import { integrationCallbackCopy } from "./integration-callback-copy.ts";

test("connect success keeps the connected copy", () => {
  assert.deepEqual(integrationCallbackCopy({ status: "success" }), {
    title: "You’re connected",
    description: "Return to Anarlog to keep going.",
  });
});

test("disconnect success does not reuse the connected copy", () => {
  assert.deepEqual(
    integrationCallbackCopy({
      status: "success",
      disconnectedConnectionId: "conn_123",
    }),
    {
      title: "You’re disconnected",
      description: "Return to Anarlog to keep going.",
    },
  );
});

test("connect and disconnect failures keep their own copy", () => {
  assert.deepEqual(integrationCallbackCopy({ status: "error" }), {
    title: "Connection didn’t work",
    description: "Something went wrong while connecting.",
  });
  assert.deepEqual(
    integrationCallbackCopy({
      status: "error",
      disconnectedConnectionId: "conn_123",
    }),
    {
      title: "Disconnect didn’t work",
      description: "Something went wrong while disconnecting.",
    },
  );
});
