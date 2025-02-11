import { useCallback } from "react";
import { CopyIcon, TrashIcon, HeartIcon, EditIcon } from "lucide-react";

import type { Template } from "@/types";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { SectionsList } from "../components/template-sections";

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

  const handleLike = useCallback(() => {
    // TODO: Implement like functionality
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Input
              disabled={disabled}
              value={template.title}
              onChange={handleChangeTitle}
              className="text-lg font-semibold"
              placeholder="Template Title"
            />
          </div>
          <div className="flex gap-2">
            {isCreator ? (
              <>
                <Button variant="outline" size="sm" onClick={handleDuplicate}>
                  <CopyIcon className="mr-2 h-4 w-4" />
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" onClick={handleDelete}>
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleDuplicate}>
                  <EditIcon className="mr-2 h-4 w-4" />
                  Edit a Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleLike}>
                  <HeartIcon className="mr-2 h-4 w-4" />
                  Like
                </Button>
              </>
            )}
          </div>
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
