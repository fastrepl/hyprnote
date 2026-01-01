import { convertFileSrc } from "@tauri-apps/api/core";

import { commands } from "./bindings.gen";

export interface PagefindSearchResult {
  id: string;
  score: number;
  words: number[];
  data: () => Promise<PagefindSearchFragment>;
}

export interface PagefindSearchFragment {
  url: string;
  content: string;
  word_count: number;
  filters: Record<string, string[]>;
  meta: Record<string, string>;
  anchors: Array<{
    element: string;
    id: string;
    text: string;
    location: number;
  }>;
  weighted_locations: Array<{
    weight: number;
    balanced_score: number;
    location: number;
  }>;
  locations: number[];
  raw_content: string;
  raw_url: string;
  excerpt: string;
  sub_results: Array<{
    title: string;
    url: string;
    anchor: {
      element: string;
      id: string;
      text: string;
      location: number;
    } | null;
    weighted_locations: Array<{
      weight: number;
      balanced_score: number;
      location: number;
    }>;
    locations: number[];
    excerpt: string;
  }>;
}

export interface PagefindSearchResponse {
  results: PagefindSearchResult[];
  unfilteredResultCount: number;
  filters: Record<string, Record<string, number>>;
  totalFilters: Record<string, Record<string, number>>;
  timings: {
    preload: number;
    search: number;
    total: number;
  };
}

interface PagefindInstance {
  options: (opts: { bundlePath: string }) => Promise<void>;
  init: () => Promise<void>;
  search: (
    query: string,
    options?: {
      filters?: Record<string, string | string[]>;
      sort?: Record<string, "asc" | "desc">;
    },
  ) => Promise<PagefindSearchResponse>;
  debouncedSearch: (
    query: string,
    options?: {
      filters?: Record<string, string | string[]>;
      sort?: Record<string, "asc" | "desc">;
    },
    debounceMs?: number,
  ) => Promise<PagefindSearchResponse | null>;
  filters: () => Promise<Record<string, Record<string, number>>>;
  preload: (
    query: string,
    options?: {
      filters?: Record<string, string | string[]>;
    },
  ) => Promise<void>;
  destroy: () => Promise<void>;
}

let pagefindInstance: PagefindInstance | null = null;

export async function initPagefind(): Promise<void> {
  const bundlePathResult = await commands.getBundlePath();
  if (bundlePathResult.status === "error") {
    throw new Error(`Failed to get bundle path: ${bundlePathResult.error}`);
  }

  const bundlePath = bundlePathResult.data;
  const bundleUrl = convertFileSrc(bundlePath);

  const pagefindJsUrl = `${bundleUrl}/pagefind.js`;

  const pagefind = (await import(
    /* @vite-ignore */ pagefindJsUrl
  )) as PagefindInstance;

  await pagefind.options({ bundlePath: `${bundleUrl}/` });
  await pagefind.init();

  pagefindInstance = pagefind;
}

async function getPagefind(): Promise<PagefindInstance> {
  if (!pagefindInstance) {
    await initPagefind();
  }
  if (!pagefindInstance) {
    throw new Error("Pagefind not initialized");
  }
  return pagefindInstance;
}

export async function search(
  query: string,
  options?: {
    filters?: Record<string, string | string[]>;
    sort?: Record<string, "asc" | "desc">;
  },
): Promise<PagefindSearchResponse> {
  const pagefind = await getPagefind();
  return pagefind.search(query, options);
}

export async function debouncedSearch(
  query: string,
  options?: {
    filters?: Record<string, string | string[]>;
    sort?: Record<string, "asc" | "desc">;
  },
  debounceMs?: number,
): Promise<PagefindSearchResponse | null> {
  const pagefind = await getPagefind();
  return pagefind.debouncedSearch(query, options, debounceMs);
}

export async function getFilters(): Promise<
  Record<string, Record<string, number>>
> {
  const pagefind = await getPagefind();
  return pagefind.filters();
}

export async function preload(
  query: string,
  options?: {
    filters?: Record<string, string | string[]>;
  },
): Promise<void> {
  const pagefind = await getPagefind();
  return pagefind.preload(query, options);
}

export async function destroyPagefind(): Promise<void> {
  if (pagefindInstance) {
    await pagefindInstance.destroy();
    pagefindInstance = null;
  }
}

export function isInitialized(): boolean {
  return pagefindInstance !== null;
}
