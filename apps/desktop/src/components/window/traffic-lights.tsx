import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import { cn } from "@hypr/utils";

export function TrafficLights({ className }: { className?: string }) {
  const win = getCurrentWebviewWindow();

  const onClose = () => win.close();
  const onMinimize = () => win.minimize();
  const onMaximize = () => win.toggleMaximize();

  return (
    <div className={cn(["flex gap-2 items-center", className])}>
      <button
        type="button"
        data-tauri-drag-region="false"
        onClick={onClose}
        className="h-3 w-3 rounded-full bg-[#ff5f57] border border-black/10 hover:brightness-90 transition-all"
      />
      <button
        type="button"
        data-tauri-drag-region="false"
        onClick={onMinimize}
        className="h-3 w-3 rounded-full bg-[#ffbd2e] border border-black/10 hover:brightness-90 transition-all"
      />
      <button
        type="button"
        data-tauri-drag-region="false"
        onClick={onMaximize}
        className="h-3 w-3 rounded-full bg-[#28c840] border border-black/10 hover:brightness-90 transition-all"
      />
    </div>
  );
}
