import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useCallback, useState } from "react";
import GridLayout, { Layout } from "react-grid-layout";

import { WidgetGroup } from "@hypr/extension-utils";

import DinoExtension from "@hypr/extension-dino-game";
import TranscriptExtension from "@hypr/extension-transcript";
import SummaryExtension from "@hypr/extension-summary";

const getTwoByOne = (group: WidgetGroup) => {
  const item = group.items.find((item) => item.type === "twoByOne");
  if (!item) {
    return null;
  }
  return item.component;
};

const getTwoByTwo = (group: WidgetGroup) => {
  const item = group.items.find((item) => item.type === "twoByTwo");
  if (!item) {
    return null;
  }
  return item.component;
};

const getFull = (group: WidgetGroup) => {
  const item = group.items.find((item) => item.type === "full");
  if (!item) {
    return null;
  }
  return item.component;
};

const CC1 = getTwoByOne(DinoExtension["chromeDino"])!;
const CC2 = getTwoByTwo(SummaryExtension["bullet"])!;

const TranscriptLive2x2 = getTwoByTwo(TranscriptExtension["default"])!;
const TranscriptLiveFull = getFull(TranscriptExtension["default"])!;

export default function WidgetRenderer() {
  const [layout, setLayout] = useState<Layout[]>([
    {
      i: "1",
      x: 0,
      y: 0,
      w: 2,
      h: 1,
    },
    {
      i: "2",
      x: 0,
      y: 0,
      w: 2,
      h: 2,
    },
    {
      i: "3",
      x: 0,
      y: 0,
      w: 2,
      h: 2,
    },
  ]);

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout);
  }, []);

  const [showFull, setShowFull] = useState(false);

  return (
    <>
      {showFull ? (
        <TranscriptLiveFull onMinimize={() => setShowFull(false)} />
      ) : (
        <GridLayout
          layout={layout}
          cols={2}
          rowHeight={160}
          width={380}
          margin={[20, 20]}
          onLayoutChange={handleLayoutChange}
          isDraggable={true}
          isResizable={false}
          compactType="vertical"
          draggableCancel=".not-draggable"
        >
          <div key="1">
            <CC1 />
          </div>
          <div key="3">
            <TranscriptLive2x2
              onMaximize={() => {
                setShowFull(true);
              }}
            />
          </div>
          <div key="2">
            <CC2 />
          </div>
        </GridLayout>
      )}
    </>
  );
}
