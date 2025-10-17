import * as React from "react";

import { cn } from "../../lib/utils";
import { Spinner } from "./spinner";

type ButtonVariant = "default" | "destructive" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const styles = {
  base:
    "inline-flex items-center justify-center gap-1 rounded-lg font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",

  variants: {
    default:
      "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 focus:ring-2 focus:ring-primary/20",
    destructive:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 focus:ring-2 focus:ring-destructive/20",
    outline:
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 focus:ring-2 focus:ring-accent/20",
    ghost:
      "text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80 focus:ring-2 focus:ring-accent/20",
  },

  sizes: {
    sm: "px-2 py-1.5 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-2.5 text-base",
    icon: "p-1.5",
  },
} as const;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      isLoading,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          styles.base,
          styles.variants[variant],
          styles.sizes[size],
          isLoading && "cursor-wait opacity-80",
          className,
        )}
        {...props}
      >
        {isLoading && <Spinner size={16} />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
