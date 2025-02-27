import { LinkProps } from "@tanstack/react-router";

export const createURL = (to: LinkProps["to"], search: LinkProps["search"]) => {
  const url = new URL(to as string);
  const params = new URLSearchParams(search as Record<string, string>);
  url.search = params.toString();
  return url;
};

export function assert<T extends never>() {}
export type TypeEqualityGuard<A, B> = Exclude<A, B> | Exclude<B, A>;
