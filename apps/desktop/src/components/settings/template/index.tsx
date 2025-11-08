import { useState } from "react";

import { TemplateEditor } from "./editor";
import { LocalTemplates } from "./local";
import { RemoteTemplates } from "./remote";
import { TemplateSearch } from "./search";
import { useTemplateNavigation } from "./utils";

export function SettingsTemplates() {
  const { templateId } = useTemplateNavigation();

  if (templateId) {
    return <TemplateEditor id={templateId} />;
  }

  return <TemplateList />;
}

function TemplateList() {
  const [searchQuery, setSearchQuery] = useState("");
  const { goToEdit, cloneAndEdit } = useTemplateNavigation();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mb-6">
          <TemplateSearch value={searchQuery} onChange={setSearchQuery} />
        </div>
        <LocalTemplates query={searchQuery} onSelect={goToEdit} />
      </div>

      <RemoteTemplates query={searchQuery} onClone={cloneAndEdit} />
    </div>
  );
}
