import "@/styles/pushable-button.css";

import React, { ButtonHTMLAttributes } from "react";

interface PushableButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function PushableButton({
  children,
  className,
  ...props
}: PushableButtonProps) {
  return (
    <button className={`pushable ${className || ""}`} {...props}>
      <span className="front">{children}</span>
    </button>
  );
}

export default PushableButton;
