export * from "./timeline";

export const id = () => crypto.randomUUID() as string;

// https://www.rfc-editor.org/rfc/rfc4122#section-4.1.7
export const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";
