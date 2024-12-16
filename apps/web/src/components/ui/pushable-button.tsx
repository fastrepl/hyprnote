import "@/styles/pushable-button.css";

import React, { ButtonHTMLAttributes } from "react";

interface PushableButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const PushableButton: React.FC<PushableButtonProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <button className={`pushable ${className || ""}`} {...props}>
      <span className="front">{children}</span>
    </button>
  );
};

export default PushableButton;
