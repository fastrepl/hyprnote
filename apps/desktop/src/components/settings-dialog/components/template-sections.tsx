import { useCallback, useState } from "react";
import { GripVertical as HandleIcon, PlusIcon } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";

import type { Template } from "@/types";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { Button } from "@hypr/ui/components/ui/button";

type ReorderItem = Template["sections"][number];

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

  const handleAddSection = () => {
    const newItem = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
    };
    setItems([...items, newItem]);
    onChange([...items, newItem]);
  };

  return (
    <div className="flex flex-col">
      <Reorder.Group values={items} onReorder={handleReorder}>
        <div className="flex flex-col">
          {items.map((item) => (
            <Reorder.Item key={item.id} value={item} className="mb-4">
              <div className="relative cursor-move bg-neutral-50">
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 cursor-move opacity-50 hover:opacity-100"
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

      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={handleAddSection}
        disabled={disabled}
      >
        <PlusIcon className="mr-2 h-4 w-4" />
        Add Section
      </Button>
    </div>
  );
}

interface SectionItemProps {
  disabled: boolean;
  item: ReorderItem & { id: string };
  onChange: (item: ReorderItem & { id: string }) => void;
}

export function SectionItem({ disabled, item, onChange }: SectionItemProps) {
  const handleChangeTitle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...item, title: e.target.value });
    },
    [item, onChange],
  );

  const handleChangeDescription = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ ...item, description: e.target.value });
    },
    [item, onChange],
  );

  return (
    <div className="ml-8 flex flex-col gap-2 rounded-lg border p-4">
      <Input
        disabled={disabled}
        value={item.title}
        onChange={handleChangeTitle}
        placeholder="Enter a section title"
      />
      <Textarea
        disabled={disabled}
        value={item.description}
        onChange={handleChangeDescription}
        placeholder="Describe the content and purpose of this section"
      />
    </div>
  );
}
