import type { Store } from "../../store/main";
import { createJsonFilePersister } from "../factories";

export function createTemplatePersister(store: Store) {
  return createJsonFilePersister(store, {
    tableName: "templates",
    filename: "templates.json",
    label: "TemplatePersister",
  });
}
