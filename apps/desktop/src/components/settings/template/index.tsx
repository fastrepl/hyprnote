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

  return (
    <div className="flex flex-col gap-8">
      <TemplateSearch value={searchQuery} onChange={setSearchQuery} />
      <LocalTemplates query={searchQuery} />
      <RemoteTemplates query={searchQuery} />
    </div>
  );
}
