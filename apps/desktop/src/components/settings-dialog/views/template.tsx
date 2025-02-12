import { useCallback } from "react";
import {
  CopyIcon,
  TrashIcon,
  EditIcon,
  MoreHorizontalIcon,
} from "lucide-react";

import type { Template } from "@/types";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { SectionsList } from "../components/template-sections";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@hypr/ui/components/ui/dropdown-menu";

interface TemplateEditorProps {
  disabled: boolean;
  template: Template;
  onTemplateUpdate: (template: Template) => void;
  isCreator?: boolean;
}

export default function TemplateEditor({
  disabled,
  template,
  onTemplateUpdate,
  isCreator = true, // Temporary default until we add creator info to Template type
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

  const handleDuplicate = useCallback(() => {
    // TODO: Implement duplicate functionality
  }, []);

  const handleDelete = useCallback(() => {
    // TODO: Implement delete functionality
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-4">
        <div className="flex items-center justify-between">
          <Input
            disabled={disabled}
            value={template.title}
            onChange={handleChangeTitle}
            className="rounded-none border-0 p-0 !text-2xl font-semibold focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Untitled Template"
          />

          {isCreator ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <CopyIcon className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete}>
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={handleDuplicate}
              className="rounded-md p-2 hover:bg-neutral-100"
            >
              <EditIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div>Creator: John Doe</div>
          <div>•</div>
          <div>Permissions: Public</div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Description</h2>
        <Textarea
          disabled={disabled}
          value={template.description}
          onChange={handleChangeDescription}
          placeholder="Add a description..."
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
