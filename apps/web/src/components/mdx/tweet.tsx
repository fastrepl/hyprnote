"use client";

import { Tweet as TweetBase } from "react-tweet";

export function Tweet({ id }: { id: string }) {
  return <TweetBase id={id} apiUrl={`/api/tweet/${id}`} />;
}
