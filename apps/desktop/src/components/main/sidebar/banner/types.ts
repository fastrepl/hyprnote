import type { ReactNode } from "react";

export type BannerAction = {
  label: string;
  onClick: () => void | Promise<void>;
};

export type BannerType = {
  id: string;
  icon?: ReactNode;
  title?: string;
  description: ReactNode;
  primaryAction?: BannerAction;
  secondaryAction?: BannerAction;
  dismissible: boolean;
  variant?: "default" | "error";
};

export type BannerCondition = () => boolean;
