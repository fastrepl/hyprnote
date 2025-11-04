import { Check, MinusCircle, Pencil, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";
import * as main from "../../../store/tinybase/main";
import { QUERIES, STORE_ID, UI } from "../../../store/tinybase/main";
import { id } from "../../../utils";

interface VocabItem {
  text: string;
  rowId: string;
}

function useVocabMutations() {
  const store = UI.useStore(STORE_ID);
  const internalStore = main.UI.useStore(main.STORE_ID);
  const userId = internalStore?.getValue("user_id");

  return {
    create: (text: string) => {
      if (!store || !userId) {
        return;
      }
      const newId = id();
      store.setRow("memories", newId, {
        user_id: userId,
        type: "vocab",
        text,
        created_at: new Date().toISOString(),
      });
    },
    update: (rowId: string, text: string) => {
      if (!store) {
        return;
      }
      store.setCell("memories", rowId, "text", text);
    },
    delete: (rowId: string) => {
      if (!store) {
        return;
      }
      store.delRow("memories", rowId);
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
  const [searchValue, setSearchValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

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

  const handleAdd = () => {
    const text = searchValue.trim();
    if (text && !exactMatch) {
      mutations.create(text);
      setSearchValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && showAddButton) {
      e.preventDefault();
      handleAdd();
    }
  };

  const startEdit = (item: VocabItem) => {
    setEditingId(item.rowId);
    setEditValues({ ...editValues, [item.rowId]: item.text });
  };

  const cancelEdit = (rowId: string) => {
    setEditingId(null);
    const { [rowId]: _, ...rest } = editValues;
    setEditValues(rest);
  };

  const saveEdit = (rowId: string) => {
    const newText = editValues[rowId]?.trim();
    if (!newText) {
      return;
    }

    const isDuplicate = vocabItems.some(
      (item) => item.rowId !== rowId && item.text.toLowerCase() === newText.toLowerCase(),
    );
    if (isDuplicate) {
      return;
    }

    mutations.update(rowId, newText);
    setEditingId(null);
    const { [rowId]: _, ...rest } = editValues;
    setEditValues(rest);
  };

  return (
    <div>
      <h3 className="text-sm font-medium mb-1">Custom vocabulary</h3>
      <p className="text-xs text-neutral-600 mb-3">
        Add jargons or industry/company-specific terms to improve transcription accuracy
      </p>

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or add custom vocabulary"
            className="flex-1 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none bg-transparent"
          />
          {showAddButton && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAdd}
              className="h-auto p-0 hover:bg-transparent text-neutral-600 hover:text-neutral-900"
            >
              <Plus className="h-4 w-4" />
              <span className="ml-1 text-sm">Add</span>
            </Button>
          )}
        </div>

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
                  isEditing={editingId === item.rowId}
                  editValue={editValues[item.rowId] ?? item.text}
                  onEditValueChange={(value) => setEditValues({ ...editValues, [item.rowId]: value })}
                  onStartEdit={() => startEdit(item)}
                  onCancelEdit={() => cancelEdit(item.rowId)}
                  onSaveEdit={() => saveEdit(item.rowId)}
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
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRemove: () => void;
}

function VocabularyItem({
  item,
  isEditing,
  editValue,
  onEditValueChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
}: VocabularyItemProps) {
  const [hoveredItem, setHoveredItem] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSaveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancelEdit();
    }
  };

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
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm text-neutral-900 focus:outline-none bg-transparent"
            autoFocus
          />
        )
        : <span className="text-sm text-neutral-700">{item.text}</span>}
      <div className="flex items-center gap-1">
        {isEditing
          ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onSaveEdit}
                className="h-auto p-0 hover:bg-transparent"
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
