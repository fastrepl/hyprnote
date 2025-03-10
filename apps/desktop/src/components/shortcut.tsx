import { CommandShortcut } from "@hypr/ui/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import { type as getOsType } from "@tauri-apps/plugin-os";

export default function Shortcut({
  macDisplay,
  windowsDisplay,
}: {
  macDisplay: string;
  windowsDisplay: string;
}) {
  const osType = useQuery({
    queryKey: ["osType"],
    queryFn: () => getOsType(),
    staleTime: Infinity,
  });

  if (osType.data === "macos") {
    return (
      <CommandShortcut className="font-mono ">{macDisplay}</CommandShortcut>
    );
  }

  return (
    <CommandShortcut className="font-mono ">{windowsDisplay}</CommandShortcut>
  );
}
