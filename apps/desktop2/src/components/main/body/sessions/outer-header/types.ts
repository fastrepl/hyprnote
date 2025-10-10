import * as persisted from "../../../../../store/tinybase/persisted";

export type SessionRowProp = {
  sessionRow: ReturnType<typeof persisted.UI.useRow<"sessions">>;
};
