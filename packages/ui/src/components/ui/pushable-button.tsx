import "../../styles/pushable.css";

import { ButtonHTMLAttributes, type ReactNode } from "react";

interface PushableButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export default function PushableButton({
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
