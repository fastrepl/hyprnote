import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { useUpdateTemplate } from "../shared.tsx";
import { SectionsList } from "./sections-list";

export function TemplateEditor({ id }: { id: string }) {
  const { value, handle } = useUpdateTemplate(id);

  const handleSectionsChange = (sections: any[]) => {
    handle.setField("sections", sections.map(({ id, ...rest }) => rest));
  };

  return (
    <div className="space-y-6">
      {/* Title Input */}
      <div>
        <Input
          value={value.title || ""}
          onChange={(e) => handle.setField("title", e.target.value)}
          placeholder="Enter template title"
          className="border-0 shadow-none text-lg font-medium px-0 focus-visible:ring-0"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={value.description || ""}
          onChange={(e) => handle.setField("description", e.target.value)}
          placeholder="Describe the template purpose and usage..."
          className="min-h-[100px] resize-none"
        />
      </div>

      {/* Sections */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Sections</label>
        <SectionsList
          disabled={false}
          items={value.sections || []}
          onChange={handleSectionsChange}
        />
      </div>
    </div>
  );
}
