import { useLingui } from "@lingui/react/macro";
import { GripVertical as HandleIcon, PlusIcon } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { useCallback, useRef, useState } from "react";

import { type Template } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";

export type Section = Template["sections"][number];

interface SectionsListProps {
  disabled: boolean;
  items: Section[];
  onChange: (items: Section[]) => void;
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

  const groupRef = useRef<HTMLDivElement>(null);

  const handleChange = (item: Section & { id: string }) => {
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
    <div ref={groupRef} className="flex-1 flex flex-col">
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={handleReorder}
        className="flex flex-col"
      >
        {items.map((item) => (
          <Reorder.Item key={item.id} value={item} className="mb-4" dragConstraints={groupRef}>
            <div className="relative cursor-move">
              <button
                className="absolute -left-5 top-1/2 -translate-y-1/2 cursor-move opacity-50 hover:opacity-100"
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
  item: Section & { id: string };
  onChange: (item: Section & { id: string }) => void;
}

export function SectionItem({ disabled, item, onChange }: SectionItemProps) {
  const { t } = useLingui();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  };

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
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <Input
        disabled={disabled}
        value={item.title}
        onChange={handleChangeTitle}
        placeholder={t`Enter a section title`}
        className="focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <Textarea
        ref={textareaRef}
        disabled={disabled}
        value={item.description}
        onChange={handleChangeDescription}
        onInput={handleInput}
        placeholder={t`Describe the content and purpose of this section`}
        className="focus-visible:ring-0 focus-visible:ring-offset-0"
        style={{ minHeight: 48, maxHeight: 200, resize: "vertical" }}
      />
    </div>
  );
}
