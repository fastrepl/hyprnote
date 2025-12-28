import type { CalendarColor } from "./bindings.gen";

export function colorToCSS(color?: CalendarColor | null): string {
  const DEFAULT_COLOR = "#888";

  if (!color || !color.red || !color.green || !color.blue || !color.alpha) {
    return DEFAULT_COLOR;
  }

  return `rgba(${Math.round(color.red * 255)}, ${Math.round(color.green * 255)}, ${Math.round(color.blue * 255)}, ${color.alpha})`;
}
