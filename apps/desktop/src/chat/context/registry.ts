import { CalendarIcon, MonitorIcon, UserIcon } from "lucide-react";

import type { ContextEntity, ContextEntityKind } from "../context-item";

export type ContextChipProps = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tooltip: string;
  removable?: boolean;
};

type EntityRenderer<E extends ContextEntity> = {
  toChip: (entity: E) => ContextChipProps | null;
  toPromptBlock: (entity: E) => string | null;
};

type ExtractEntity<K extends ContextEntityKind> = Extract<
  ContextEntity,
  { kind: K }
>;

type RendererMap = {
  [K in ContextEntityKind]: EntityRenderer<ExtractEntity<K>>;
};

const renderers: RendererMap = {
  session: {
    toChip: (entity) => {
      const { sessionContext } = entity;
      const wordCount =
        sessionContext.transcript?.segments.reduce(
          (sum, s) => sum + s.text.split(/\s+/).filter(Boolean).length,
          0,
        ) ?? 0;
      const participantCount = sessionContext.participants.length;
      const eventTitle = sessionContext.event?.name ?? null;

      if (
        !sessionContext.title &&
        !sessionContext.date &&
        !wordCount &&
        !sessionContext.rawContent &&
        participantCount === 0 &&
        !eventTitle
      ) {
        return null;
      }
      const lines: string[] = [];
      if (sessionContext.title) lines.push(sessionContext.title);
      if (sessionContext.date) lines.push(sessionContext.date);
      if (wordCount > 0) {
        lines.push(`Transcript: ${wordCount.toLocaleString()} words`);
      }
      if (participantCount > 0) {
        lines.push(`Participants: ${participantCount}`);
      }
      if (eventTitle) {
        lines.push(`Event: ${eventTitle}`);
      }
      if (sessionContext.rawContent) {
        const truncated =
          sessionContext.rawContent.length > 120
            ? `${sessionContext.rawContent.slice(0, 120)}...`
            : sessionContext.rawContent;
        lines.push(`Raw note: ${truncated}`);
      }
      return {
        key: entity.key,
        icon: CalendarIcon,
        label: sessionContext.title || "Session",
        tooltip: lines.join("\n"),
        removable: entity.removable,
      };
    },
    toPromptBlock: () => null,
  },

  account: {
    toChip: (entity) => {
      if (!entity.email && !entity.userId) return null;
      const lines: string[] = [];
      if (entity.email) lines.push(entity.email);
      if (entity.userId) lines.push(`ID: ${entity.userId}`);
      return {
        key: entity.key,
        icon: UserIcon,
        label: "Account",
        tooltip: lines.join("\n"),
      };
    },
    toPromptBlock: (entity) => {
      const lines: string[] = [];
      if (entity.email) lines.push(`- Email: ${entity.email}`);
      if (entity.userId) lines.push(`- User ID: ${entity.userId}`);
      return lines.length > 0 ? lines.join("\n") : null;
    },
  },

  device: {
    toChip: (entity) => {
      const lines: string[] = [];
      if (entity.platform) lines.push(`Platform: ${entity.platform}`);
      if (entity.arch) lines.push(`Architecture: ${entity.arch}`);
      if (entity.osVersion) lines.push(`OS Version: ${entity.osVersion}`);
      if (entity.appVersion) lines.push(`App: ${entity.appVersion}`);
      if (entity.buildHash) lines.push(`Build: ${entity.buildHash}`);
      if (entity.locale) lines.push(`Locale: ${entity.locale}`);
      return {
        key: entity.key,
        icon: MonitorIcon,
        label: "Device",
        tooltip: lines.join("\n"),
      };
    },
    toPromptBlock: (entity) => {
      const lines: string[] = [];
      if (entity.platform) lines.push(`- Platform: ${entity.platform}`);
      if (entity.arch) lines.push(`- Architecture: ${entity.arch}`);
      if (entity.osVersion) lines.push(`- OS Version: ${entity.osVersion}`);
      if (entity.appVersion) lines.push(`- App: ${entity.appVersion}`);
      if (entity.buildHash) lines.push(`- Build: ${entity.buildHash}`);
      if (entity.locale) lines.push(`- Locale: ${entity.locale}`);
      return lines.length > 0 ? lines.join("\n") : null;
    },
  },
} satisfies RendererMap;

export function renderChip(entity: ContextEntity): ContextChipProps | null {
  const renderer = renderers[entity.kind] as EntityRenderer<typeof entity>;
  return renderer.toChip(entity);
}

export function renderPromptBlock(entity: ContextEntity): string | null {
  const renderer = renderers[entity.kind] as EntityRenderer<typeof entity>;
  return renderer.toPromptBlock(entity);
}
