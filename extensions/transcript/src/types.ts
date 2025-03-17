import { type TimelineView as BaseTimelineView } from "@hypr/plugin-listener";

export interface TimelineViewItem extends BaseTimelineView {
  originalText?: string;
}

export interface TimelineView {
  items: TimelineViewItem[];
}
