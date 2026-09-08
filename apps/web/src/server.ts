import "../instrument.server.mjs";

import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";

export default createServerEntry({
  fetch: createStartHandler(defaultStreamHandler),
});
