import * as React from "react";

import { cn } from "../../lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showOverlay?: boolean;
  preventClose?: boolean;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "h-[calc(100vh-96px)] w-[calc(100vw-96px)]",
};

export function Modal({
  open,
  onClose,
  children,
  className,
  size = "md",
  showOverlay = true,
  preventClose = false,
}: ModalProps) {
  React.useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open && !preventClose) {
        event.preventDefault();
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscapeKey, true);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey, true);
    };
  }, [open, preventClose, onClose]);

  if (!open) return null;

  return (
    <>
      {showOverlay && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          aria-hidden="true"
          onClick={preventClose ? undefined : onClose}
        >
          <div
            data-tauri-drag-region
            className="w-full min-h-11"
            onClick={(e) => e.stopPropagation()}
          >
          </div>
        </div>
      )}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "overflow-clip rounded-lg bg-background shadow-lg",
          sizeClasses[size],
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}

interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  return <div className={cn("flex flex-col", className)}>{children}</div>;
}

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div className={cn("flex-1 overflow-auto p-6 h-full", className)}>
      {children}
    </div>
  );
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 px-6 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ModalTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalTitle({ children, className }: ModalTitleProps) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none", className)}>
      {children}
    </h2>
  );
}

interface ModalDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalDescription({
  children,
  className,
}: ModalDescriptionProps) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>;
}
