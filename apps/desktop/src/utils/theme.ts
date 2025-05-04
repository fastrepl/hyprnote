import { emit, listen } from "@tauri-apps/api/event";
import { setTheme as setTauriTheme } from "@tauri-apps/api/app";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

export type Theme = "dark" | "light";
const THEME_EVENT = "theme-changed";
const THEME_STORAGE_KEY = "theme";

// Apply theme to the DOM
export function applyTheme(theme: Theme) {
  // Update document classes
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(theme);
  
  // Update Tauri native theme
  try {
    setTauriTheme(theme).catch(err => {
      console.error("Failed to set Tauri theme:", err);
    });
  } catch (e) {
    console.error("Failed to call Tauri setTheme:", e);
  }
  
  // Store in localStorage for persistence
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

// Set theme and broadcast to other windows
export async function setTheme(theme: Theme) {
  // Apply theme locally
  applyTheme(theme);
  
  // Broadcast to other windows
  try {
    const currentWindow = getCurrentWebviewWindowLabel();
    await emit(THEME_EVENT, { theme, source: currentWindow });
  } catch (e) {
    console.error("Failed to broadcast theme change:", e);
  }
}

// Get the current theme from localStorage
export function getTheme(): Theme {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  return savedTheme || "dark"; // Default to dark
}

// Listen for theme changes from other windows
export function listenForThemeChanges() {
  const currentWindow = getCurrentWebviewWindowLabel();
  
  listen<{ theme: Theme, source: string }>(THEME_EVENT, (event) => {
    // Skip if the event was sent by this window
    if (event.payload.source === currentWindow) {
      return;
    }
    
    // Apply theme without broadcasting again
    applyTheme(event.payload.theme);
  }).catch(err => {
    console.error("Failed to set up theme listener:", err);
  });
}