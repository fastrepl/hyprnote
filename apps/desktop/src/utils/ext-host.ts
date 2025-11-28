export function isExtHostPath(pathname: string): boolean {
  return pathname === "/app/ext-host" || pathname.startsWith("/app/ext-host/");
}
