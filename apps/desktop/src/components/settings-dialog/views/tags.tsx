import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Tag as TagIcon,
  MoreVertical,
  Check,
  Trash2,
} from "lucide-react";
import { Input } from "@hypr/ui/components/ui/input";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@hypr/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { Trans } from "@lingui/react/macro";

type Tag = {
  id: string;
  name: string;
  count: number;
};

// Example tags - replace with actual data
const tags: Tag[] = [
  {
    id: "1",
    name: "Strategy",
    count: 5,
  },
  {
    id: "2",
    name: "Sales",
    count: 3,
  },
  {
    id: "3",
    name: "Meeting",
    count: 10,
  },
];

export default function TagsComponent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const filteredTags = useMemo(() => {
    if (!searchQuery) return tags;

    const query = searchQuery.toLowerCase();
    return tags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [searchQuery]);

  const handleStartEdit = (tag: Tag) => {
    setEditingTag(tag.id);
    setEditValue(tag.name);
  };

  const handleSaveEdit = (tag: Tag) => {
    if (editValue.trim() && editValue !== tag.name) {
      // TODO: Implement tag rename
      console.log("Rename tag:", tag.id, "to:", editValue);
    }
    setEditingTag(null);
    setEditValue("");
  };

  const handleDelete = (tag: Tag) => {
    // TODO: Implement delete functionality
    console.log("Delete tag:", tag);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Type to search..."
            className="max-w-60 pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="secondary" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4" />
          <Trans>Add tag</Trans>
        </Button>
      </div>

      <div className="overflow-clip rounded-lg border bg-card">
        <div className="grid grid-cols-2 gap-4 border-b bg-neutral-50 px-6 py-3 text-sm font-bold text-neutral-700">
          <div>
            <Trans>Tag</Trans>
          </div>
          <div>
            <Trans>Notes</Trans>
          </div>
        </div>

        <div>
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="grid grid-cols-2 gap-4 border-t px-6 py-4 first:border-t-0"
            >
              <div className="flex items-center gap-3">
                {editingTag === tag.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-8"
                      autoFocus
                      onBlur={() => {
                        setEditingTag(null);
                        setEditValue("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSaveEdit(tag);
                        } else if (e.key === "Escape") {
                          setEditingTag(null);
                          setEditValue("");
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleSaveEdit(tag)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="cursor-pointer text-sm font-medium hover:text-foreground"
                    onClick={() => handleStartEdit(tag)}
                  >
                    {tag.name}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {tag.count} {tag.count === 1 ? "note" : "notes"}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(tag)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <Trans>Delete</Trans>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}

          {filteredTags.length === 0 && (
            <div className="px-6 py-4 text-sm text-muted-foreground">
              <Trans>No tags found</Trans>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              <Trans>Add new tag</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>
                Create a new tag to help organize and categorize your notes.
              </Trans>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                <Trans>Tag name</Trans>
              </label>
              <Input
                placeholder="Enter tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setNewTagName("");
                  setShowAddModal(false);
                }}
              >
                <Trans>Cancel</Trans>
              </Button>
              <Button
                onClick={() => {
                  // TODO: Implement tag creation
                  setNewTagName("");
                  setShowAddModal(false);
                }}
                disabled={!newTagName.trim()}
              >
                <Trans>Add tag</Trans>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
