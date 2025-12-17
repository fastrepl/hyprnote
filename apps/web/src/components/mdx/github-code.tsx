"use client";

import { useEffect, useRef } from "react";

export function GithubCode({
  url,
  style = "github",
  showBorder = true,
  showLineNumbers = true,
  showFileMeta = true,
  showFullPath = false,
  showCopy = true,
}: {
  url: string;
  style?: string;
  showBorder?: boolean;
  showLineNumbers?: boolean;
  showFileMeta?: boolean;
  showFullPath?: boolean;
  showCopy?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = "";

    const params = new URLSearchParams({
      target: url,
      style,
      type: "code",
      showBorder: showBorder ? "on" : "off",
      showLineNumbers: showLineNumbers ? "on" : "off",
      showFileMeta: showFileMeta ? "on" : "off",
      showFullPath: showFullPath ? "on" : "off",
      showCopy: showCopy ? "on" : "off",
    });

    const script = document.createElement("script");
    script.src = `https://emgithub.com/embed-v2.js?${params.toString()}`;
    script.async = true;

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [
    url,
    style,
    showBorder,
    showLineNumbers,
    showFileMeta,
    showFullPath,
    showCopy,
  ]);

  return <div ref={containerRef} className="my-4" />;
}
