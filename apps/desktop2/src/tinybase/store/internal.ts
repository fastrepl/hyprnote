import { createMergeableStoreWithSync } from "../shared";

export const initInternal = () => {
  const store = createMergeableStoreWithSync();

  return {
    store,
  };
};

// .setTablesSchema({
//     // https://electric-sql.com/openapi
//     electricsql: {
//       table: { type: "string" },
//       offset: { type: "string" },
//       handle: { type: "string" },
//     },
//   });
