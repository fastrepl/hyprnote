import { CalendarIcon, MonitorIcon, UserIcon } from "lucide-react";

import type { ChatContext } from "@hypr/plugin-template";

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
  toTemplateContext: (entity: E) => ChatContext | null;
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
      const { chatContext } = entity;
      if (
        !chatContext.title &&
        !chatContext.date &&
        !entity.wordCount &&
        !entity.rawNotePreview &&
        entity.participantCount === undefined &&
        !entity.eventTitle
      ) {
        return null;
      }
      const lines: string[] = [];
      if (chatContext.title) lines.push(chatContext.title);
      if (chatContext.date) lines.push(chatContext.date);
      if (entity.wordCount && entity.wordCount > 0) {
        lines.push(`Transcript: ${entity.wordCount.toLocaleString()} words`);
      }
      if (entity.participantCount !== undefined) {
        lines.push(`Participants: ${entity.participantCount}`);
      }
      if (entity.eventTitle) {
        lines.push(`Event: ${entity.eventTitle}`);
      }
      if (entity.rawNotePreview) {
        const truncated =
          entity.rawNotePreview.length > 120
            ? `${entity.rawNotePreview.slice(0, 120)}...`
            : entity.rawNotePreview;
        lines.push(`Raw note: ${truncated}`);
      }
      return {
        key: entity.key,
        icon: CalendarIcon,
        label: chatContext.title || "Session",
        tooltip: lines.join("\n"),
        removable: entity.removable,
      };
    },
    toPromptBlock: () => null,
    toTemplateContext: (entity) => entity.chatContext,
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
    toTemplateContext: () => null,
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
    toTemplateContext: () => null,
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

export function renderTemplateContext(
  entity: ContextEntity,
): ChatContext | null {
  const renderer = renderers[entity.kind] as EntityRenderer<typeof entity>;
  return renderer.toTemplateContext(entity);
}
