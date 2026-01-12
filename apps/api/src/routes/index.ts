import { Hono } from "hono";

import type { AppBindings } from "../hono-bindings";
import { billing } from "./billing";
import { fileTranscription } from "./file-transcription";
import { health } from "./health";
import { rpc } from "./rpc";
import { webhook } from "./webhook";

export { API_TAGS } from "./constants";

export const routes = new Hono<AppBindings>();

routes.route("/health", health);
routes.route("/billing", billing);
routes.route("/file-transcription", fileTranscription);
routes.route("/rpc", rpc);
routes.route("/webhook", webhook);
