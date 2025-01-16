import { Node } from "prosemirror-model";
import { getSchema, JSONContent } from "@tiptap/core";

import { extensions } from "./index";

export const validateSchema = (doc: JSONContent): boolean => {
  try {
    const schema = getSchema(extensions);
    const contentNode = Node.fromJSON(schema, doc);
    contentNode.check();
    return true;
  } catch (e) {
    return false;
  }
};
