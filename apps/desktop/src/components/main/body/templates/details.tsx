import { useForm } from "@tanstack/react-form";
import { GripVertical as HandleIcon, Plus, StickyNote, X } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TemplateEditor as CodeMirrorEditor } from "@hypr/codemirror/template";
import type { Template, TemplateSection, TemplateStorage } from "@hypr/store";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { cn, formatDistanceToNow } from "@hypr/utils";

import * as main from "../../../../store/tinybase/main";
import { useTabs } from "../../../../store/zustand/tabs";

function normalizeTemplatePayload(template: unknown): Template {
  const record = (
    template && typeof template === "object" ? template : {}
  ) as Record<string, unknown>;

  let sections: TemplateSection[] = [];
  if (typeof record.sections === "string") {
    try {
      sections = JSON.parse(record.sections);
    } catch {
      sections = [];
    }
  } else if (Array.isArray(record.sections)) {
    sections = record.sections.map((s: unknown) => {
      const sec = s as Record<string, unknown>;
      return {
        title: typeof sec.title === "string" ? sec.title : "",
        description: typeof sec.description === "string" ? sec.description : "",
      };
    });
  }

  let targets: string[] = [];
  if (typeof record.targets === "string") {
    try {
      targets = JSON.parse(record.targets);
    } catch {
      targets = [];
    }
  } else if (Array.isArray(record.targets)) {
    targets = record.targets.filter((t): t is string => typeof t === "string");
  }

  return {
    user_id: typeof record.user_id === "string" ? record.user_id : "",
    created_at: typeof record.created_at === "string" ? record.created_at : "",
    title: typeof record.title === "string" ? record.title : "",
    description:
      typeof record.description === "string" ? record.description : "",
    sections,
    targets,
  };
}

export function TemplateDetailsColumn({
  selectedTemplateId,
  handleDeleteTemplate,
}: {
  selectedTemplateId: string | null;
  handleDeleteTemplate: (id: string) => void;
}) {
  if (!selectedTemplateId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-neutral-500">
          Select a template to view details
        </p>
      </div>
    );
  }

  return (
    <TemplateDetails
      key={selectedTemplateId}
      id={selectedTemplateId}
      handleDeleteTemplate={handleDeleteTemplate}
    />
  );
}

function TemplateDetails({
  id,
  handleDeleteTemplate,
}: {
  id: string;
  handleDeleteTemplate: (id: string) => void;
}) {
  const row = main.UI.useRow("templates", id, main.STORE_ID);
  const value = row ? normalizeTemplatePayload(row) : undefined;

  const handleUpdate = main.UI.useSetPartialRowCallback(
    "templates",
    id,
    (row: Partial<Template>) =>
      ({
        ...row,
        sections: row.sections ? JSON.stringify(row.sections) : undefined,
        targets: row.targets ? JSON.stringify(row.targets) : undefined,
      }) satisfies Partial<TemplateStorage>,
    [id],
    main.STORE_ID,
  );

  const form = useForm({
    defaultValues: {
      title: value?.title ?? "",
      description: value?.description ?? "",
      sections: value?.sections ?? [],
    },
    listeners: {
      onChange: ({ formApi }) => {
        queueMicrotask(() => {
          const {
            form: { errors },
          } = formApi.getAllErrors();
          if (errors.length === 0) {
            formApi.handleSubmit();
          }
        });
      },
    },
    onSubmit: ({ value }) => {
      handleUpdate(value);
    },
  });

  if (!value) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-neutral-500">Template not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="px-6 py-4 border-b border-neutral-200">
        <form.Field name="title">
          {(field) => (
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Enter template title"
              className="border-0 shadow-none text-lg font-semibold px-0 focus-visible:ring-0 h-8"
            />
          )}
        </form.Field>
        <form.Field name="description">
          {(field) => (
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Describe the template purpose..."
              className="border-0 shadow-none px-0 text-sm text-neutral-600 resize-none focus-visible:ring-0 min-h-[40px]"
              rows={2}
            />
          )}
        </form.Field>
        {value.targets && value.targets.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {value.targets.map((target, index) => (
              <span
                key={index}
                className="text-xs text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded"
              >
                {target}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 border-b border-neutral-200">
          <h3 className="text-sm font-medium text-neutral-600 mb-3">
            Sections
          </h3>
          <form.Field name="sections">
            {(field) => (
              <SectionsList
                disabled={false}
                items={field.state.value}
                onChange={(items) => field.handleChange(items)}
              />
            )}
          </form.Field>
        </div>

        <div className="p-6 border-b border-neutral-200">
          <h3 className="text-sm font-medium text-neutral-600 mb-4">
            Related Notes
          </h3>
          <RelatedSessions templateId={id} />
        </div>

        <div className="p-6">
          <div className="border border-red-200 rounded-lg overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-200">
              <h3 className="text-sm font-semibold text-red-900">
                Danger Zone
              </h3>
            </div>
            <div className="bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    Delete this template
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    This action cannot be undone
                  </p>
                </div>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteTemplate(id);
                  }}
                  variant="destructive"
                  size="sm"
                >
                  Delete Template
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="pb-96" />
      </div>
    </div>
  );
}

function RelatedSessions({ templateId }: { templateId: string }) {
  const store = main.UI.useStore(main.STORE_ID);
  const openCurrent = useTabs((state) => state.openCurrent);
  const enhancedNoteIds = main.UI.useSliceRowIds(
    main.INDEXES.enhancedNotesByTemplate,
    templateId,
    main.STORE_ID,
  );

  const sessionIds = useMemo(() => {
    if (!store || !enhancedNoteIds) return [];

    const uniqueSessionIds = new Set<string>();
    for (const noteId of enhancedNoteIds) {
      const sessionId = store.getCell("enhanced_notes", noteId, "session_id");
      if (typeof sessionId === "string" && sessionId) {
        uniqueSessionIds.add(sessionId);
      }
    }
    return Array.from(uniqueSessionIds);
  }, [store, enhancedNoteIds]);

  if (sessionIds.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
        <p className="text-sm text-neutral-500">
          Notes enhanced with this template will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessionIds.map((sessionId) => (
        <RelatedSessionItem
          key={sessionId}
          sessionId={sessionId}
          onClick={() => openCurrent({ type: "sessions", id: sessionId })}
        />
      ))}
    </div>
  );
}

function RelatedSessionItem({
  sessionId,
  onClick,
}: {
  sessionId: string;
  onClick: () => void;
}) {
  const title = main.UI.useCell("sessions", sessionId, "title", main.STORE_ID);
  const createdAt = main.UI.useCell(
    "sessions",
    sessionId,
    "created_at",
    main.STORE_ID,
  );

  const timeAgo = useMemo(() => {
    if (!createdAt) return "";
    return formatDistanceToNow(new Date(String(createdAt)));
  }, [createdAt]);

  return (
    <button
      onClick={onClick}
      className={cn([
        "w-full px-3 py-2.5",
        "flex items-center gap-3",
        "hover:bg-neutral-50 active:bg-neutral-100",
        "rounded-lg border border-neutral-200 transition-colors",
        "text-left",
      ])}
    >
      <StickyNote className="w-4 h-4 text-neutral-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-900 truncate">
          {title || "Untitled"}
        </div>
        {timeAgo && <div className="text-xs text-neutral-500">{timeAgo}</div>}
      </div>
    </button>
  );
}

type SectionDraft = TemplateSection & { key: string };

function createDraft(section: TemplateSection, key?: string): SectionDraft {
  return {
    key: key ?? crypto.randomUUID(),
    title: section.title,
    description: section.description,
  };
}

function toSection(draft: SectionDraft): TemplateSection {
  return {
    title: draft.title,
    description: draft.description,
  };
}

function sameSection(draft: SectionDraft, section?: TemplateSection) {
  if (!section) {
    return false;
  }
  return (
    draft.title === section.title && draft.description === section.description
  );
}

function useEditableSections({
  disabled,
  initialItems,
  onChange,
}: {
  disabled: boolean;
  initialItems: TemplateSection[];
  onChange: (items: TemplateSection[]) => void;
}) {
  const [drafts, setDrafts] = useState<SectionDraft[]>(() =>
    initialItems.map((section) => createDraft(section)),
  );

  useEffect(() => {
    setDrafts((prev) => {
      const shouldUpdate =
        prev.length !== initialItems.length ||
        prev.some((draft, index) => !sameSection(draft, initialItems[index]));

      if (!shouldUpdate) {
        return prev;
      }

      return initialItems.map((section, index) =>
        createDraft(section, prev[index]?.key),
      );
    });
  }, [initialItems]);

  const commitDrafts = useCallback(
    (next: SectionDraft[] | ((prev: SectionDraft[]) => SectionDraft[])) => {
      setDrafts((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        onChange(resolved.map((draft) => toSection(draft)));
        return resolved;
      });
    },
    [onChange],
  );

  const changeSection = useCallback(
    (draft: SectionDraft) => {
      commitDrafts((prev) =>
        prev.map((section) => (section.key === draft.key ? draft : section)),
      );
    },
    [commitDrafts],
  );

  const deleteSection = useCallback(
    (key: string) => {
      commitDrafts((prev) => prev.filter((section) => section.key !== key));
    },
    [commitDrafts],
  );

  const reorderSections = useCallback(
    (next: SectionDraft[]) => {
      if (disabled) {
        return;
      }
      commitDrafts(next);
    },
    [commitDrafts, disabled],
  );

  const addSection = useCallback(() => {
    commitDrafts((prev) => [
      ...prev,
      createDraft({ title: "", description: "" }),
    ]);
  }, [commitDrafts]);

  return {
    drafts,
    addSection,
    changeSection,
    deleteSection,
    reorderSections,
  };
}

function SectionsList({
  disabled,
  items: _items,
  onChange,
}: {
  disabled: boolean;
  items: TemplateSection[];
  onChange: (items: TemplateSection[]) => void;
}) {
  const controls = useDragControls();
  const { drafts, addSection, changeSection, deleteSection, reorderSections } =
    useEditableSections({
      disabled,
      initialItems: _items,
      onChange,
    });

  return (
    <div className="flex flex-col space-y-3">
      <Reorder.Group values={drafts} onReorder={reorderSections}>
        <div className="flex flex-col space-y-2">
          {drafts.map((draft) => (
            <Reorder.Item key={draft.key} value={draft}>
              <SectionItem
                disabled={disabled}
                item={draft}
                onChange={changeSection}
                onDelete={deleteSection}
                dragControls={controls}
              />
            </Reorder.Item>
          ))}
        </div>
      </Reorder.Group>

      <Button
        variant="outline"
        size="sm"
        className="text-sm w-full"
        onClick={addSection}
        disabled={disabled}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Section
      </Button>
    </div>
  );
}

function SectionItem({
  disabled,
  item,
  onChange,
  onDelete,
  dragControls,
}: {
  disabled: boolean;
  item: SectionDraft;
  onChange: (item: SectionDraft) => void;
  onDelete: (key: string) => void;
  dragControls: ReturnType<typeof useDragControls>;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="group relative bg-white">
      <button
        className="absolute -left-5 top-2.5 cursor-move opacity-0 group-hover:opacity-30 hover:opacity-60 transition-opacity"
        onPointerDown={(event) => dragControls.start(event)}
        disabled={disabled}
      >
        <HandleIcon className="h-4 w-4 text-muted-foreground" />
      </button>

      <button
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-30 hover:opacity-100 transition-all"
        onClick={() => onDelete(item.key)}
        disabled={disabled}
      >
        <X size={16} />
      </button>

      <div className="space-y-1">
        <Input
          disabled={disabled}
          value={item.title}
          onChange={(e) => onChange({ ...item, title: e.target.value })}
          placeholder="Untitled"
          className="border-0 bg-transparent p-0 font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
        />

        <div
          className={cn([
            "min-h-[100px] border rounded-xl overflow-clip transition-colors",
            isFocused
              ? "border-blue-500 ring-2 ring-primary/20"
              : "border-input",
          ])}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          <CodeMirrorEditor
            value={item.description}
            onChange={(value) => onChange({ ...item, description: value })}
            placeholder="Template content with Jinja2: {{ variable }}, {% if condition %}"
            readOnly={disabled}
          />
        </div>
      </div>
    </div>
  );
}
