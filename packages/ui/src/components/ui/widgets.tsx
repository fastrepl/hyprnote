import React, { type ReactNode, useState, useEffect } from "react";
import { Button } from "./button";
import { Maximize2Icon } from "lucide-react";

// Custom hook for dark mode detection
function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isDarkMode;
}

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
  const isDarkMode = useDarkMode();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: isDarkMode ? "#f5f5f5" : "inherit", // neutral-100 for dark mode
      }}
    >
      {leading && <div>{leading}</div>}
      {title && (
        <div
          style={{
            flex: 1,
            fontSize: "18px",
            fontWeight: 600,
            color: isDarkMode ? "#f5f5f5" : "inherit", // neutral-100 for dark mode
          }}
        >
          {title}
        </div>
      )}
      {actions && (
        <div
          style={{ display: "flex", alignItems: "center" }}
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
  const isDarkMode = useDarkMode();

  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderWidth: "1px",
        borderRadius: "16px",
        overflow: "hidden",
        background: isDarkMode ? "#525252" : "white", // neutral-600 in dark mode
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
  props: Omit<WidgetWrapperPropsNonFullSize, "width" | "height">,
) => <WidgetWrapper width="340px" height="340px" {...props} />;

const WidgetOneByOneWrapper = (
  props: Omit<WidgetWrapperPropsNonFullSize, "width" | "height">,
) => <WidgetWrapper width="160px" height="160px" {...props} />;

const WidgetTwoByOneWrapper = (
  props: Omit<WidgetWrapperPropsNonFullSize, "width" | "height">,
) => <WidgetWrapper width="340px" height="160px" {...props} />;

const WidgetFullSizeWrapper = ({
  onMinimize,
  ...props
}: Omit<WidgetWrapperPropsFullSize, "width" | "height" | "onMaximize"> & {
  onMinimize: () => void;
}) => <WidgetWrapper width="360px" height="100%" {...props} />;

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
  WidgetWrapper,
  WidgetHeader,
  WidgetTwoByTwoWrapper,
  WidgetOneByOneWrapper,
  WidgetTwoByOneWrapper,
  WidgetFullSizeWrapper,
  type WidgetTwoByTwo,
  type WidgetOneByOne,
  type WidgetTwoByOne,
  type WidgetFullSize,
};
