export function getInitials(name: string | null | undefined, maxLength: number = 2): string {
  if (!name) return "?";

  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, maxLength);
}
