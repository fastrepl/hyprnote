import { useEffect, useState } from "react";

export type Platform = "mac" | "windows" | "linux" | "mobile" | "unknown";

export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>("unknown");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

    if (isMobile) {
      setPlatform("mobile");
    } else if (userAgent.includes("mac")) {
      setPlatform("mac");
    } else if (userAgent.includes("win")) {
      setPlatform("windows");
    } else if (userAgent.includes("linux")) {
      setPlatform("linux");
    } else {
      setPlatform("unknown");
    }
  }, []);

  return platform;
}

export function getPlatformCTA(platform: Platform): {
  label: string;
  action: "download" | "waitlist";
} {
  if (platform === "mac") {
    return { label: "Download", action: "download" };
  }
  return { label: "Join waitlist", action: "waitlist" };
}

export function getHeroCTA(platform: Platform): {
  buttonLabel: string;
  showInput: boolean;
  inputPlaceholder: string;
} {
  if (platform === "mac") {
    return {
      buttonLabel: "Download",
      showInput: false,
      inputPlaceholder: "",
    };
  } else if (platform === "mobile") {
    return {
      buttonLabel: "Remind me",
      showInput: true,
      inputPlaceholder: "Enter your email",
    };
  }
  // windows, linux, unknown
  return {
    buttonLabel: "Join",
    showInput: true,
    inputPlaceholder: "Enter your email",
  };
}
