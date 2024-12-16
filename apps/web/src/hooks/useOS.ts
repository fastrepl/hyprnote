"use client";

import { useState, useEffect } from "react";

type OS = "Mac" | "Windows" | "Linux" | "Unknown";

export function useOS() {
  const [os, setOS] = useState<OS>("Unknown");

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();

    if (userAgent.includes("win")) {
      setOS("Windows");
    } else if (userAgent.includes("mac")) {
      setOS("Mac");
    } else if (userAgent.includes("linux")) {
      setOS("Linux");
    }
  }, []);

  return os;
}
