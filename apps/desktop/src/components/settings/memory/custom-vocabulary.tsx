import { useForm } from "@tanstack/react-form";
import { Check, MinusCircle, Pencil, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

import * as internal from "../../../store/tinybase/internal";
import { QUERIES, STORE_ID, UI } from "../../../store/tinybase/main";
import { id } from "../../../utils";

interface CustomVocabularyViewProps {
  value?: string[];
  onChange?: (value: string[]) => void;
}

export function CustomVocabularyView({ value: _value, onChange: _onChange }: CustomVocabularyViewProps) {
  const store = UI.useStore(STORE_ID);
  const internalStore = internal.UI.useStore(internal.STORE_ID);
  const userId = internalStore?.getValue("user_id");
  const [searchValue, setSearchValue] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formVocabulary, setFormVocabulary] = useState<Array<{ text: string; rowId: string }>>([]);

  const vocabItems = useVocabs();

  const form = useForm({
    defaultValues: {
      vocabulary: vocabItems.map((item) => ({ text: item.text, rowId: item.rowId })),
    },
    onSubmit: async ({ value }) => {
      if (!store || !userId) {
        return;
      }

      value.vocabulary.forEach((item, index) => {
        const existingItem = vocabItems[index];
        if (existingItem && item.text !== existingItem.text) {
          store.setCell("memories", item.rowId, "text", item.text);
        }
      });
    },
  });

  useEffect(() => {
    const newVocab = vocabItems.map((item) => ({ text: item.text, rowId: item.rowId }));
    form.setFieldValue("vocabulary", newVocab);
    setFormVocabulary(newVocab);
  }, [vocabItems]);

  const filteredItems = useMemo(() => {
    if (!searchValue.trim()) {
      return formVocabulary;
    }
    const query = searchValue.toLowerCase();
    return formVocabulary.filter((item) => item.text.toLowerCase().startsWith(query));
  }, [formVocabulary, searchValue]);

  const allTexts = formVocabulary.map((item) => item.text.toLowerCase());
  const exactMatch = allTexts.includes(searchValue.toLowerCase());
  const showAddButton = searchValue.trim() && !exactMatch;

  const handleAdd = () => {
    const newVocab = searchValue.trim();
    if (newVocab && !exactMatch && store && userId) {
      const newId = id();
      store.setRow("memories", newId, {
        user_id: userId,
        type: "vocab",
        text: newVocab,
        created_at: new Date().toISOString(),
      });
      setSearchValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && showAddButton) {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (rowId: string) => {
    if (!store) {
      return;
    }
    store.delRow("memories", rowId);
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

        <form.Field name="vocabulary" mode="array">
          {() => (
            <div className="max-h-[300px] overflow-y-auto">
              {filteredItems.length === 0
                ? (
                  <div className="px-4 py-8 text-center text-sm text-neutral-400">
                    {searchValue.trim() ? "No matching terms" : "No custom vocabulary added"}
                  </div>
                )
                : (
                  filteredItems.map((item) => {
                    const actualIndex = formVocabulary.findIndex(
                      (v) => v.rowId === item.rowId,
                    );
                    const isEditing = editingIndex === actualIndex;

                    return (
                      <form.Field
                        key={item.rowId}
                        name={`vocabulary[${actualIndex}].text`}
                        validators={{
                          onBlur: ({ value }) => {
                            const trimmed = value.trim();
                            if (!trimmed) {
                              return "Vocabulary cannot be empty";
                            }
                            const allOtherTexts = allTexts.filter((_, idx) => idx !== actualIndex);
                            if (allOtherTexts.includes(trimmed.toLowerCase())) {
                              return "This vocabulary already exists";
                            }
                            return undefined;
                          },
                        }}
                      >
                        {(subField) => (
                          <VocabularyItem
                            field={subField}
                            isEditing={isEditing}
                            onStartEdit={() => setEditingIndex(actualIndex)}
                            onCancelEdit={() => {
                              subField.setValue(subField.state.value);
                              setEditingIndex(null);
                            }}
                            onSaveEdit={() => {
                              const newText = subField.state.value.trim();
                              const allOtherTexts = allTexts.filter((_, idx) => idx !== actualIndex);

                              if (!newText || allOtherTexts.includes(newText.toLowerCase())) {
                                return;
                              }

                              if (store) {
                                store.setCell("memories", item.rowId, "text", newText);
                              }
                              setEditingIndex(null);
                            }}
                            onRemove={() => handleRemove(item.rowId)}
                          />
                        )}
                      </form.Field>
                    );
                  })
                )}
            </div>
          )}
        </form.Field>
      </div>
    </div>
  );
}

function useVocabs() {
  const table = UI.useResultTable(QUERIES.visibleVocabs, STORE_ID);
  const ret = useMemo(() => {
    return Object.entries(table).map((
      [rowId, { text }],
    ) => ({ rowId, text } as { rowId: string; text: string }));
  }, [table]);
  return ret;
}

interface VocabularyItemProps {
  field: any;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRemove: () => void;
}

function VocabularyItem({
  field,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
}: VocabularyItemProps) {
  const [hoveredItem, setHoveredItem] = useState(false);
  const [localValue, setLocalValue] = useState(field.state.value);

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(field.state.value);
    }
  }, [isEditing, field.state.value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSaveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setLocalValue(field.state.value);
      onCancelEdit();
    }
  };

  const hasError = field.state.meta.errors && field.state.meta.errors.length > 0;
  const errorMessage = hasError ? field.state.meta.errors[0] : null;

  return (
    <div>
      <div
        className={cn([
          "flex items-center justify-between px-4 py-3 border-b border-neutral-100 last:border-b-0",
          !isEditing && "hover:bg-neutral-50 transition-colors",
          hasError && "bg-red-50",
        ])}
        onMouseEnter={() => setHoveredItem(true)}
        onMouseLeave={() => setHoveredItem(false)}
      >
        {isEditing
          ? (
            <input
              type="text"
              value={localValue}
              onChange={(e) => {
                setLocalValue(e.target.value);
                field.handleChange(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 text-sm text-neutral-900 focus:outline-none bg-transparent"
              autoFocus
            />
          )
          : <span className="text-sm text-neutral-700">{field.state.value}</span>}
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
                  onClick={() => {
                    setLocalValue(field.state.value);
                    onCancelEdit();
                  }}
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
      {hasError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100">
          <p className="text-xs text-red-600">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
