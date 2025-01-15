import React, { useCallback, useState } from "react";
import { EditIcon, GripVertical as HandleIcon } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";

import type { Template } from "@/types/tauri";

import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { Button } from "@hypr/ui/components/ui/button";

type ReorderItem = Template["sections"][number];

interface TemplateEditorProps {
  disabled: boolean;
  template: Template;
  onTemplateUpdate: (template: Template) => void;
}

export default function TemplateEditor({
  disabled,
  template,
  onTemplateUpdate,
}: TemplateEditorProps) {
  const handleChangeTitle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onTemplateUpdate({ ...template, title: e.target.value });
    },
    [onTemplateUpdate, template],
  );

  const handleChangeDescription = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onTemplateUpdate({ ...template, description: e.target.value });
    },
    [onTemplateUpdate, template],
  );

  const handleChangeSections = useCallback(
    (sections: Template["sections"]) => {
      onTemplateUpdate({ ...template, sections });
    },
    [onTemplateUpdate, template],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Title</h2>
          <Button variant="outline" size="icon">
            <EditIcon className="h-2 w-2" />
          </Button>
        </div>
        <Input
          disabled={disabled}
          value={template.title}
          onChange={handleChangeTitle}
        />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Description</h2>
        <Textarea
          disabled={disabled}
          value={template.description}
          onChange={handleChangeDescription}
        />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Sections</h2>
        <SectionsList
          disabled={disabled}
          items={template.sections}
          onChange={handleChangeSections}
        />
      </div>
    </div>
  );
}

interface SectionsListProps {
  disabled: boolean;
  items: ReorderItem[];
  onChange: (items: ReorderItem[]) => void;
}

function SectionsList({
  disabled,
  items: _items,
  onChange,
}: SectionsListProps) {
  const controls = useDragControls();

  const [items, setItems] = useState(
    _items.map((item) => ({ ...item, id: crypto.randomUUID() as string })),
  );

  const handleChange = (item: ReorderItem & { id: string }) => {
    setItems(items.map((i) => (i.id === item.id ? item : i)));
    onChange(items);
  };

  const handleReorder = (v: typeof items) => {
    if (disabled) {
      return;
    }
    setItems(v);
  };

  return (
    <Reorder.Group values={items} onReorder={handleReorder}>
      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <Reorder.Item key={item.id} value={item}>
            <div className="relative cursor-move bg-gray-50">
              <button
                className="absolute top-1/2 -translate-y-1/2 cursor-move opacity-50 hover:opacity-100"
                onPointerDown={(e) => controls.start(e)}
              >
                <HandleIcon className="h-4 w-4" />
              </button>
              <SectionItem
                disabled={disabled}
                item={item}
                onChange={handleChange}
              />
            </div>
          </Reorder.Item>
        ))}
      </div>
    </Reorder.Group>
  );
}

interface SectionItemProps {
  disabled: boolean;
  item: ReorderItem & { id: string };
  onChange: (item: ReorderItem & { id: string }) => void;
}

function SectionItem({ disabled, item, onChange }: SectionItemProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border p-4">
      <Input
        disabled={disabled}
        value={item.title}
        onChange={(e) => onChange({ ...item, title: e.target.value })}
      />
      <Textarea
        disabled={disabled}
        value={item.description}
        onChange={(e) => onChange({ ...item, description: e.target.value })}
      />
    </div>
  );
}
