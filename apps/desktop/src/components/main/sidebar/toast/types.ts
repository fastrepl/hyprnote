import type { ReactNode } from "react";

export type ToastAction = {
  label: string;
  onClick: () => void | Promise<void>;
};

export type ToastType = {
  id: string;
  icon?: ReactNode;
  title?: string;
  description: ReactNode;
  primaryAction?: ToastAction;
  secondaryAction?: ToastAction;
  dismissible: boolean;
  progress?: number;
};

export type ToastCondition = () => boolean;
