import { TemplateEditor as CodeMirrorEditor } from "@hypr/codemirror/template";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { cn } from "@hypr/utils";

import { GripVertical as HandleIcon, Plus, X } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { type ChangeEvent, type PointerEvent, useCallback, useState } from "react";

import * as main from "../../../store/tinybase/main";

type ReorderItem = main.TemplateSection;

type EditableSection = ReorderItem & { id: string };

interface UseEditableSectionsOptions {
  disabled: boolean;
  initialItems: ReorderItem[];
  onChange: (items: ReorderItem[]) => void;
}

interface UseEditableSectionsResult {
  items: EditableSection[];
  addSection: () => void;
  changeSection: (item: EditableSection) => void;
  deleteSection: (itemId: string) => void;
  reorderSections: (items: EditableSection[]) => void;
}

type DragControls = ReturnType<typeof useDragControls>;

function useEditableSections({
  disabled,
  initialItems,
  onChange,
}: UseEditableSectionsOptions): UseEditableSectionsResult {
  const [items, setItems] = useState<EditableSection[]>(() =>
    initialItems.map((item) => ({ ...item, id: crypto.randomUUID() }))
  );

  const updateItems = useCallback(
    (
      next:
        | EditableSection[]
        | ((prev: EditableSection[]) => EditableSection[]),
    ) => {
      setItems((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        onChange(resolved);
        return resolved;
      });
    },
    [onChange],
  );

  const changeSection = useCallback(
    (item: EditableSection) => {
      updateItems((prev) => prev.map((section) => (section.id === item.id ? item : section)));
    },
    [updateItems],
  );

  const deleteSection = useCallback(
    (itemId: string) => {
      updateItems((prev) => prev.filter((section) => section.id !== itemId));
    },
    [updateItems],
  );

  const reorderSections = useCallback(
    (next: EditableSection[]) => {
      if (disabled) {
        return;
      }
      updateItems(next);
    },
    [disabled, updateItems],
  );

  const addSection = useCallback(() => {
    const newSection: EditableSection = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
    };
    updateItems((prev) => [...prev, newSection]);
  }, [updateItems]);

  return {
    items,
    addSection,
    changeSection,
    deleteSection,
    reorderSections,
  };
}

interface SectionsListProps {
  disabled: boolean;
  items: ReorderItem[];
  onChange: (items: ReorderItem[]) => void;
}

export function SectionsList({
  disabled,
  items: _items,
  onChange,
}: SectionsListProps) {
  const controls = useDragControls();
  const {
    items,
    addSection,
    changeSection,
    deleteSection,
    reorderSections,
  } = useEditableSections({
    disabled,
    initialItems: _items,
    onChange,
  });

  return (
    <div className="flex flex-col space-y-3">
      <div className="bg-neutral-50 rounded-lg p-4">
        <Reorder.Group values={items} onReorder={reorderSections}>
          <div className="flex flex-col space-y-2">
            {items.map((item) => (
              <Reorder.Item key={item.id} value={item}>
                <SectionItem
                  disabled={disabled}
                  item={item}
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
          className="mt-2 text-sm w-full"
          onClick={addSection}
          disabled={disabled}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>
    </div>
  );
}

interface SectionItemProps {
  disabled: boolean;
  item: EditableSection;
  onChange: (item: EditableSection) => void;
  onDelete: (itemId: string) => void;
  dragControls: DragControls;
}

export function SectionItem({ disabled, item, onChange, onDelete, dragControls }: SectionItemProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChangeTitle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...item, title: event.target.value });
    },
    [item, onChange],
  );

  const handleChangeDescription = useCallback(
    (value: string) => {
      onChange({ ...item, description: value });
    },
    [item, onChange],
  );

  const handleDelete = useCallback(() => {
    onDelete(item.id);
  }, [item.id, onDelete]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      dragControls.start(event);
    },
    [dragControls],
  );

  return (
    <div
      className={cn([
        "group relative rounded-lg border p-3 transition-all bg-white",
        isFocused ? "border-blue-500" : "border-border hover:border-neutral-300",
      ])}
    >
      <button
        className="absolute left-2 top-2 cursor-move opacity-0 group-hover:opacity-30 hover:opacity-60 transition-opacity"
        onPointerDown={handlePointerDown}
        disabled={disabled}
      >
        <HandleIcon className="h-4 w-4 text-muted-foreground" />
      </button>

      <button
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-30 hover:opacity-100 transition-all"
        onClick={handleDelete}
        disabled={disabled}
      >
        <X size={16} />
      </button>

      <div className="ml-5 mr-5 space-y-1">
        <div>
          <Input
            disabled={disabled}
            value={item.title}
            onChange={handleChangeTitle}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Untitled"
            className="border-0 bg-transparent p-0 text-lg font-medium shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
          />
        </div>

        <div className="min-h-[100px] border rounded-md">
          <CodeMirrorEditor
            value={item.description}
            onChange={handleChangeDescription}
            placeholder="Template content with Jinja2: {{ variable }}, {% if condition %}"
            readOnly={disabled}
          />
        </div>
      </div>
    </div>
  );
}
