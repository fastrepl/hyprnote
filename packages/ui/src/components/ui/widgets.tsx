import { motion } from "motion/react";
import React, { type ReactNode } from "react";
import { Button } from "./button";
import { Maximize2Icon } from "lucide-react";

interface WidgetHeaderProps {
  leading?: ReactNode;
  title?: ReactNode;
  actions?: ReactNode[];
}

const WidgetHeader = ({
  leading,
  title,
  actions = [
    <Button variant="ghost" size="icon">
      <Maximize2Icon style={{ width: "16px", height: "16px" }} />
    </Button>,
  ],
}: WidgetHeaderProps) => {
  return (
    <header style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {leading && <div>{leading}</div>}
      {title && (
        <div style={{ flex: 1, fontSize: "18px", fontWeight: 600 }}>
          {title}
        </div>
      )}
      {actions && (
        <div style={{ display: "flex", alignItems: "center" }}>{actions}</div>
      )}
    </header>
  );
};

// NOTE: The default size is twoByTwo.
interface WidgetProps {
  width?: string;
  height?: string;
  onMaximize?: () => void;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const Widget = ({
  width = "340px",
  height = "340px",
  children,
  className,
  style,
}: WidgetProps) => {
  return (
    <motion.div
      className={className}
      style={{
        width,
        height,
        borderWidth: "1px",
        borderRadius: "16px",
        overflow: "hidden",
        background: "white",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

const WidgetTwoByTwo = (props: Omit<WidgetProps, "width" | "height">) => (
  <Widget width="340px" height="340px" {...props} />
);

const WidgetOneByOne = (props: Omit<WidgetProps, "width" | "height">) => (
  <Widget width="160px" height="160px" {...props} />
);

const WidgetTwoByOne = (props: Omit<WidgetProps, "width" | "height">) => (
  <Widget width="340px" height="160px" {...props} />
);

const WidgetFullSize = ({
  onMinimize,
  ...props
}: Omit<WidgetProps, "width" | "height" | "onMaximize"> & {
  onMinimize: () => void;
}) => <Widget width="360px" height="100%" {...props} />;

export {
  Widget,
  WidgetOneByOne,
  WidgetTwoByOne,
  WidgetFullSize,
  WidgetHeader,
  WidgetTwoByTwo,
};
