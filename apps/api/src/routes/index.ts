import { Hono } from "hono";

import type { AppBindings } from "../hono-bindings";
import { billing } from "./billing";
import { health } from "./health";
import { llm } from "./llm";
import { rpc } from "./rpc";
import { stt } from "./stt";
import { webhook } from "./webhook";

export { API_TAGS } from "./constants";

export const routes = new Hono<AppBindings>();

routes.route("/health", health);
routes.route("/billing", billing);
routes.route("/chat", llm);
routes.route("/rpc", rpc);
routes.route("/", stt);
routes.route("/webhook", webhook);
