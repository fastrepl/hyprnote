import { useEffect } from "react";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { useNavigate } from "@tanstack/react-router";

export default function DeeplinkHandler({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  useEffect(() => {
    onOpenUrl(([url]) => {
      const link = new URL(url);

      if (link.pathname === "/callback/connect") {
        navigate({
          to: "/callback/connect",
          search: { k: link.searchParams.get("k") || "" },
        });
      }
    });
  }, []);

  return children;
}
