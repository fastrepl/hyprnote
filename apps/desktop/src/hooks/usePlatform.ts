import { platform, type Platform } from "@tauri-apps/plugin-os";

export type { Platform };

export function usePlatform(): Platform {
  return platform();
}

export function useIsLinux(): boolean {
  return usePlatform() === "linux";
}

export function useIsMacos(): boolean {
  return usePlatform() === "macos";
}

export function useIsWindows(): boolean {
  return usePlatform() === "windows";
}
