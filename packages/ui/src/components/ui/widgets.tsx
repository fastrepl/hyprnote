import type { QueryClient } from "@tanstack/react-query";
import { Maximize2Icon } from "lucide-react";
import React, { type ReactNode } from "react";
import { Button } from "./button";

interface WidgetHeaderProps {
  leading?: ReactNode;
  title?: ReactNode;
  actions?: ReactNode[];
}

const WidgetHeader = ({
  leading,
  title,
  actions = [
    <Button variant="ghost" size="icon" key="maximize">
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
        <div
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
          className="not-draggable"
        >
          {actions}
        </div>
      )}
    </header>
  );
};

type WidgetWrapperPropsBase = {
  width?: string;
  height?: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

type WidgetWrapperPropsNonFullSize = WidgetWrapperPropsBase & {
  onMaximize?: () => void;
};

type WidgetWrapperPropsFullSize = WidgetWrapperPropsBase & {
  onMinimize?: () => void;
};

type WidgetWrapperProps =
  | WidgetWrapperPropsNonFullSize
  | WidgetWrapperPropsFullSize;

const WidgetWrapper = ({
  width = "340px",
  height = "340px",
  children,
  className,
  style,
}: WidgetWrapperProps) => {
  return (
    <div
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
    >
      {children}
    </div>
  );
};

const WidgetTwoByTwoWrapper = (
  props: Omit<WidgetWrapperPropsNonFullSize, "width" | "height"> & {
    queryClient?: QueryClient;
  },
) => <WidgetWrapper width="340px" height="340px" {...props} />;

const WidgetOneByOneWrapper = (
  props: Omit<WidgetWrapperPropsNonFullSize, "width" | "height"> & {
    queryClient?: QueryClient;
  },
) => <WidgetWrapper width="160px" height="160px" {...props} />;

const WidgetTwoByOneWrapper = (
  props: Omit<WidgetWrapperPropsNonFullSize, "width" | "height"> & {
    queryClient?: QueryClient;
  },
) => <WidgetWrapper width="340px" height="160px" {...props} />;

const WidgetFullSizeWrapper = ({
  onMinimize,
  ...props
}: Omit<WidgetWrapperPropsFullSize, "width" | "height" | "onMaximize"> & {
  queryClient?: QueryClient;
  onMinimize: () => void;
}) => (
  <div className="flex items-center justify-center w-full h-full p-[10px]">
    <WidgetWrapper
      width="calc(100% - 20px)"
      height="calc(100% - 20px)"
      style={{ maxWidth: "100%" }}
      {...props}
    />
  </div>
);

type WidgetTwoByTwo = (
  props: Omit<Parameters<typeof WidgetTwoByTwoWrapper>[0], "children">,
) => ReturnType<typeof WidgetTwoByTwoWrapper>;
type WidgetOneByOne = (
  props: Omit<Parameters<typeof WidgetOneByOneWrapper>[0], "children">,
) => ReturnType<typeof WidgetOneByOneWrapper>;
type WidgetTwoByOne = (
  props: Omit<Parameters<typeof WidgetTwoByOneWrapper>[0], "children">,
) => ReturnType<typeof WidgetTwoByOneWrapper>;
type WidgetFullSize = (
  props: Omit<Parameters<typeof WidgetFullSizeWrapper>[0], "children">,
) => ReturnType<typeof WidgetFullSizeWrapper>;

export {
  type WidgetFullSize,
  WidgetFullSizeWrapper,
  WidgetHeader,
  type WidgetOneByOne,
  WidgetOneByOneWrapper,
  type WidgetTwoByOne,
  WidgetTwoByOneWrapper,
  type WidgetTwoByTwo,
  WidgetTwoByTwoWrapper,
  WidgetWrapper,
};
