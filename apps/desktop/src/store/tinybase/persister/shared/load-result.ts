export type LoadResult<T> =
  | { status: "ok"; data: T }
  | { status: "error"; error: string };

export function ok<T>(data: T): LoadResult<T> {
  return { status: "ok", data };
}

export function err<T>(error: string): LoadResult<T> {
  return { status: "error", error };
}
