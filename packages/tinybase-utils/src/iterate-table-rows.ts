/**
 * Generic type for tables content - a record of table names to table data.
 * Each table is a record of row IDs to row data.
 */
export type GenericTablesContent = Record<
  string,
  Record<string, Record<string, unknown>> | undefined
>;

/**
 * Extract the row type from a table in TablesContent.
 */
export type TableRowType<
  T extends GenericTablesContent,
  K extends keyof T,
> = NonNullable<T[K]> extends Record<string, infer R> ? R : never;

/**
 * Iterate over table rows and return an array with the row ID added to each row.
 *
 * @param tables - The tables content object
 * @param tableName - The name of the table to iterate over
 * @returns An array of rows with the `id` field added
 *
 * @example
 * ```ts
 * const tables = {
 *   users: {
 *     "user-1": { name: "Alice", email: "alice@example.com" },
 *     "user-2": { name: "Bob", email: "bob@example.com" },
 *   },
 * };
 *
 * const rows = iterateTableRows(tables, "users");
 * // [
 * //   { id: "user-1", name: "Alice", email: "alice@example.com" },
 * //   { id: "user-2", name: "Bob", email: "bob@example.com" },
 * // ]
 * ```
 */
export function iterateTableRows<
  T extends GenericTablesContent,
  K extends keyof T,
>(tables: T | undefined, tableName: K): Array<TableRowType<T, K> & { id: string }> {
  const result: Array<TableRowType<T, K> & { id: string }> = [];
  const tableData = tables?.[tableName];
  if (tableData) {
    for (const [id, row] of Object.entries(tableData)) {
      result.push({ ...row, id } as TableRowType<T, K> & { id: string });
    }
  }
  return result;
}
