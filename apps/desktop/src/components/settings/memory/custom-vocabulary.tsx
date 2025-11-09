import { useForm } from "@tanstack/react-form";
import { Check, MinusCircle, Pencil, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";
import { METRICS, QUERIES, STORE_ID, UI } from "../../../store/tinybase/main";
import { id } from "../../../utils";

interface VocabItem {
  text: string;
  rowId: string;
}

function useVocabMutations() {
  const store = UI.useStore(STORE_ID);
  const userId = UI.useValue("user_id", STORE_ID);

  const createRow = UI.useSetRowCallback(
    "memories",
    () => id(),
    (text: string) => ({
      user_id: userId!,
      type: "vocab",
      text,
      created_at: new Date().toISOString(),
    }),
    [userId],
    STORE_ID,
  );

  const updateRow = UI.useSetPartialRowCallback(
    "memories",
    ({ rowId }: { rowId: string; text: string }) => rowId,
    ({ text }: { rowId: string; text: string }) => ({ text }),
    [],
    STORE_ID,
  ) as (args: { rowId: string; text: string }) => void;

  const deleteRow = UI.useDelRowCallback(
    "memories",
    (rowId: string) => rowId,
    STORE_ID,
  );

  return {
    create: (text: string) => {
      if (!store || !userId) {
        return;
      }
      createRow(text);
    },
    update: (rowId: string, text: string) => {
      if (!store) {
        return;
      }
      updateRow({ rowId, text });
    },
    delete: (rowId: string) => {
      if (!store) {
        return;
      }
      deleteRow(rowId);
    },
  };
}

function useVocabs() {
  const table = UI.useResultTable(QUERIES.visibleVocabs, STORE_ID);
  return useMemo(() => {
    return Object.entries(table).map(([rowId, { text }]) => ({
      rowId,
      text,
    } as VocabItem));
  }, [table]);
}

export function CustomVocabularyView() {
  const vocabItems = useVocabs();
  const mutations = useVocabMutations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const totalCustomVocabs = UI.useMetric(METRICS.totalCustomVocabs, STORE_ID) ?? 0;

  const form = useForm({
    defaultValues: {
      search: "",
    },
    onSubmit: ({ value }) => {
      const text = value.search.trim();
      if (text) {
        mutations.create(text);
        form.reset();
        setSearchValue("");
      }
    },
  });

  const filteredItems = useMemo(() => {
    if (!searchValue.trim()) {
      return vocabItems;
    }
    const query = searchValue.toLowerCase();
    return vocabItems.filter((item) => item.text.toLowerCase().includes(query));
  }, [vocabItems, searchValue]);

  const allTexts = vocabItems.map((item) => item.text.toLowerCase());
  const exactMatch = allTexts.includes(searchValue.toLowerCase());
  const showAddButton = searchValue.trim() && !exactMatch;

  return (
    <div>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium mb-1">Custom vocabulary</h3>
          <p className="text-xs text-neutral-600">
            Add jargons or industry/company-specific terms to improve transcription accuracy
          </p>
        </div>
        <span className="text-xs text-neutral-500 mt-1">
          {totalCustomVocabs} {totalCustomVocabs === 1 ? "term" : "terms"}
        </span>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200"
        >
          <form.Field name="search">
            {(field) => (
              <input
                type="text"
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  setSearchValue(e.target.value);
                }}
                placeholder="Search or add custom vocabulary"
                className="flex-1 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none bg-transparent"
              />
            )}
          </form.Field>
          {showAddButton && (
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="h-auto p-0 hover:bg-transparent text-neutral-600 hover:text-neutral-900"
            >
              <Plus className="h-4 w-4" />
              <span className="ml-1 text-sm">Add</span>
            </Button>
          )}
        </form>

        <div className="max-h-[300px] overflow-y-auto">
          {filteredItems.length === 0
            ? (
              <div className="px-4 py-8 text-center text-sm text-neutral-400">
                {searchValue.trim() ? "No matching terms" : "No custom vocabulary added"}
              </div>
            )
            : (
              filteredItems.map((item) => (
                <VocabularyItem
                  key={item.rowId}
                  item={item}
                  vocabItems={vocabItems}
                  isEditing={editingId === item.rowId}
                  onStartEdit={() => setEditingId(item.rowId)}
                  onCancelEdit={() => setEditingId(null)}
                  onUpdate={mutations.update}
                  onRemove={() => mutations.delete(item.rowId)}
                />
              ))
            )}
        </div>
      </div>
    </div>
  );
}

interface VocabularyItemProps {
  item: VocabItem;
  vocabItems: VocabItem[];
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (rowId: string, text: string) => void;
  onRemove: () => void;
}

function VocabularyItem({
  item,
  vocabItems,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  onRemove,
}: VocabularyItemProps) {
  const [hoveredItem, setHoveredItem] = useState(false);

  const form = useForm({
    defaultValues: {
      text: item.text,
    },
    onSubmit: ({ value }) => {
      const text = value.text.trim();
      if (text && text !== item.text) {
        onUpdate(item.rowId, text);
        onCancelEdit();
      }
    },
    validators: {
      onChange: ({ value }) => {
        const text = value.text.trim();
        if (!text) {
          return {
            fields: {
              text: "Vocabulary term cannot be empty",
            },
          };
        }
        const isDuplicate = vocabItems.some(
          (v) => v.rowId !== item.rowId && v.text.toLowerCase() === text.toLowerCase(),
        );
        if (isDuplicate) {
          return {
            fields: {
              text: "This term already exists",
            },
          };
        }
        return undefined;
      },
    },
  });

  return (
    <div
      className={cn([
        "flex items-center justify-between px-4 py-3 border-b border-neutral-100 last:border-b-0",
        !isEditing && "hover:bg-neutral-50 transition-colors",
      ])}
      onMouseEnter={() => setHoveredItem(true)}
      onMouseLeave={() => setHoveredItem(false)}
    >
      {isEditing
        ? (
          <form.Field name="text">
            {(field) => (
              <input
                type="text"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    form.handleSubmit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    onCancelEdit();
                  }
                }}
                className="flex-1 text-sm text-neutral-900 focus:outline-none bg-transparent"
                autoFocus
              />
            )}
          </form.Field>
        )
        : <span className="text-sm text-neutral-700">{item.text}</span>}
      <div className="flex items-center gap-1">
        {isEditing
          ? (
            <form.Subscribe selector={(state) => [state.canSubmit]}>
              {([canSubmit]) => (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => form.handleSubmit()}
                    disabled={!canSubmit}
                    className="h-auto p-0 hover:bg-transparent disabled:opacity-50"
                  >
                    <Check className="h-5 w-5 text-green-600" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancelEdit}
                    className="h-auto p-0 hover:bg-transparent"
                  >
                    <X className="h-5 w-5 text-neutral-500" />
                  </Button>
                </>
              )}
            </form.Subscribe>
          )
          : (
            hoveredItem && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onStartEdit}
                  className="h-auto p-0 hover:bg-transparent"
                >
                  <Pencil className="h-4 w-4 text-neutral-500" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  className="h-auto p-0 hover:bg-transparent"
                >
                  <MinusCircle className="h-5 w-5 text-red-500" />
                </Button>
              </>
            )
          )}
      </div>
    </div>
  );
}
