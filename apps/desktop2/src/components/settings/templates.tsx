import { ArrowLeft, GripVertical, Plus, X } from "lucide-react";
import { Reorder } from "motion/react";
import { useState } from "react";
import { createQueries } from "tinybase/with-schemas";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import * as internal from "../../store/tinybase/internal";
import * as persisted from "../../store/tinybase/persisted";
import { useUpdateTemplate } from "./shared";

export function SettingsTemplates() {
  const [currentTemplate, setCurrentTemplate] = useState<string | null>(null);

  const { user_id } = internal.UI.useValues(internal.STORE_ID);
  const store = persisted.UI.useStore(persisted.STORE_ID);

  const USER_TEMPLATE_QUERY = "user_templates";

  const quries = persisted.UI.useCreateQueries(
    store,
    (store) =>
      createQueries(store).setQueryDefinition(USER_TEMPLATE_QUERY, "templates", ({ select, where }) => {
        select("title");
        select("sections");
        where("user_id", user_id ?? "");
      }),
    [user_id],
  );

  const templates = persisted.UI.useResultTable(USER_TEMPLATE_QUERY, quries);

  if (currentTemplate) {
    return <TemplateEditor id={currentTemplate} onClose={() => setCurrentTemplate(null)} />;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-2">Your Templates</h1>
        <p className="text-sm text-gray-600">Select a template to enhance your meeting notes</p>
      </div>
      
      <div className="space-y-3">
        {Object.entries(templates).map(([id, template]) => (
          <TemplateCard
            key={id}
            id={id}
            title={(template as any).title || "Untitled"}
            description="Create and customize your meeting notes"
            onEdit={() => setCurrentTemplate(id)}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({
  id,
  title,
  description,
  onEdit,
}: {
  id: string;
  title: string;
  description: string;
  onEdit: () => void;
}) {
  return (
    <div
      onClick={onEdit}
      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex-1">
        <h3 className="text-lg font-medium mb-1">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <Button
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          console.log("Set as default:", id);
        }}
      >
        Set as default
      </Button>
    </div>
  );
}

function TemplateEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const { value, handle } = useUpdateTemplate(id);
  
  // Add IDs to sections for Reorder
  const [sections, setSections] = useState(() => 
    (value.sections || []).map((s: any) => ({ ...s, id: crypto.randomUUID() }))
  );

  const handleReorder = (reorderedSections: typeof sections) => {
    setSections(reorderedSections);
    handle.setField("sections", reorderedSections.map(({ id, ...rest }) => rest));
  };

  const handleUpdateSection = (sectionId: string, field: "title" | "description", newValue: string) => {
    const updatedSections = sections.map(s => 
      s.id === sectionId ? { ...s, [field]: newValue } : s
    );
    setSections(updatedSections);
    handle.setField("sections", updatedSections.map(({ id, ...rest }) => rest));
  };

  const handleRemoveSection = (sectionId: string) => {
    const updatedSections = sections.filter(s => s.id !== sectionId);
    setSections(updatedSections);
    handle.setField("sections", updatedSections.map(({ id, ...rest }) => rest));
  };

  const handleAddSection = () => {
    const newSection = { id: crypto.randomUUID(), title: "", description: "" };
    const updatedSections = [...sections, newSection];
    setSections(updatedSections);
    handle.setField("sections", updatedSections.map(({ id, ...rest }) => rest));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between border-b pb-4">
        <Button
          variant="ghost"
          onClick={onClose}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Save and close
        </Button>
        <Button
          variant="outline"
          className="text-red-500 hover:bg-red-50"
          onClick={() => console.log("Delete template:", id)}
        >
          Delete
        </Button>
      </div>

      {/* Title Input */}
      <div className="flex items-center gap-2">
        <Input
          value={value.title || ""}
          onChange={(e) => handle.setField("title", e.target.value)}
          className="text-lg font-semibold border-none p-0 focus-visible:ring-0"
          placeholder="Untitled Template"
        />
      </div>

      {/* System Instruction */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium">System Instruction</h2>
        <Textarea
          value={value.description || ""}
          onChange={(e) => handle.setField("description", e.target.value)}
          placeholder={`Describe the summary you want to generate...

• what kind of meeting is this?
• any format requirements?
• what should AI remember when summarizing?`}
          className="min-h-48 resize-none"
        />
      </div>

      {/* Sections */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Sections</h2>
        <Reorder.Group values={sections} onReorder={handleReorder} className="space-y-2">
          {sections.map((section) => (
            <Reorder.Item key={section.id} value={section}>
              <div className="group relative rounded-md border border-border bg-card p-2 transition-all">
                <button
                  className="absolute left-2 top-2 cursor-move opacity-30 hover:opacity-60 transition-opacity"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>

                <button
                  className="absolute right-2 top-2 opacity-30 hover:opacity-100 hover:text-red-500 transition-all"
                  onClick={() => handleRemoveSection(section.id)}
                >
                  <X className="h-3 w-3" />
                </button>

                <div className="ml-5 mr-5 space-y-1">
                  <Input
                    value={section.title || ""}
                    onChange={(e) => handleUpdateSection(section.id, "title", e.target.value)}
                    placeholder="Enter a section title"
                    className="border-0 bg-transparent p-0 text-base font-medium focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
                  />
                  <Textarea
                    value={section.description || ""}
                    onChange={(e) => handleUpdateSection(section.id, "description", e.target.value)}
                    placeholder="Describe the content and purpose of this section"
                    className="min-h-[30px] resize-none border-0 bg-transparent p-0 text-sm text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddSection}
          className="w-full mt-2 text-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>
    </div>
  );
}
