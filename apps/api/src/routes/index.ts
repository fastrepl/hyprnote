import { Hono } from "hono";

import type { AppBindings } from "../hono-bindings";
import { health } from "./health";
import { llm } from "./llm";
import { stt } from "./stt";
import { webhook } from "./webhook";

export { API_TAGS } from "./constants";

export const routes = new Hono<AppBindings>();

routes.route("/health", health);
routes.route("/chat", llm);
routes.route("/", stt);
routes.route("/webhook", webhook);
