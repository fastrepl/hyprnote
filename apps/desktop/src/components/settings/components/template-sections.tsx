import { useLingui } from "@lingui/react/macro";
import { GripVertical as HandleIcon, PlusIcon, XIcon } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { useCallback, useState } from "react";

import { type Template } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";

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

  const handleDelete = (itemId: string) => {
    const newItems = items.filter((item) => item.id !== itemId);
    setItems(newItems);
    onChange(newItems);
  };

  const handleReorder = (v: typeof items) => {
    if (disabled) {
      return;
    }
    setItems(v);
    onChange(v);
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
    <div className="flex flex-col space-y-3">
      <Reorder.Group values={items} onReorder={handleReorder}>
        <div className="flex flex-col space-y-2">
          {items.map((item) => (
            <Reorder.Item key={item.id} value={item}>
              <SectionItem
                disabled={disabled}
                item={item}
                onChange={handleChange}
                onDelete={handleDelete}
                dragControls={controls}
              />
            </Reorder.Item>
          ))}
        </div>
      </Reorder.Group>

      <Button
        variant="outline"
        size="sm"
        className="mt-2 text-sm"
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
  onDelete: (itemId: string) => void;
  dragControls: any;
}

export function SectionItem({ disabled, item, onChange, onDelete, dragControls }: SectionItemProps) {
  const { t } = useLingui();

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

  const handleDelete = useCallback(() => {
    onDelete(item.id);
  }, [item.id, onDelete]);

  return (
    <div className="group relative rounded-md border border-border bg-card p-2 transition-all">
      <button
        className="absolute left-2 top-2 cursor-move opacity-30 hover:opacity-60 transition-opacity"
        onPointerDown={(e) => dragControls.start(e)}
        disabled={disabled}
      >
        <HandleIcon className="h-4 w-4 text-muted-foreground" />
      </button>

      <button
        className="absolute right-2 top-2 opacity-30 hover:opacity-100 hover:text-red-500 transition-all"
        onClick={handleDelete}
        disabled={disabled}
      >
        <XIcon className="h-3 w-3" />
      </button>

      <div className="ml-5 mr-5 space-y-1">
        <div>
          <Input
            disabled={disabled}
            value={item.title}
            onChange={handleChangeTitle}
            placeholder={t`Enter a section title`}
            className="border-0 bg-transparent p-0 text-base font-medium focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
          />
        </div>

        <div>
          <Textarea
            disabled={disabled}
            value={item.description}
            onChange={handleChangeDescription}
            placeholder={t`Describe the content and purpose of this section`}
            className="min-h-[30px] resize-none border-0 bg-transparent p-0 text-sm text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
          />
        </div>
      </div>
    </div>
  );
}
