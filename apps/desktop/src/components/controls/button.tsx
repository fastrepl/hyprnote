// https://github.com/agmmnn/tauri-controls/blob/f3592f0/apps/tauri-controls/src/tauri-controls/components/button.tsx

import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/utils";

export function Button({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex cursor-default items-center justify-center",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
