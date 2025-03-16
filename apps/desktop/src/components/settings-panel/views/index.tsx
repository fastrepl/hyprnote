import { type ReactNode, useEffect, useRef } from "react";

import { type ExtensionDefinition, type Template } from "@hypr/plugin-db";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@hypr/ui/components/ui/breadcrumb";
import { Trans } from "@lingui/react/macro";
import { type NavNames } from "../types";

interface SettingsPanelBodyProps {
  title: NavNames | "Profile";
  selectedTemplate: Template | null;
  selectedExtension: ExtensionDefinition | null;
  children: ReactNode;
  setActive: (name: NavNames | "Profile") => void;
}

export function SettingsPanelBody({
  title,
  selectedTemplate,
  selectedExtension,
  children,
  setActive,
}: SettingsPanelBodyProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [title, selectedTemplate?.id, selectedExtension?.id]);

  // Function to render the translated title
  const renderTranslatedTitle = () => {
    switch (title) {
      case "General":
        return <Trans>General</Trans>;
      case "Calendar":
        return <Trans>Calendar</Trans>;
      case "Notifications":
        return <Trans>Notifications</Trans>;
      case "Templates":
        return <Trans>Templates</Trans>;
      case "Extensions":
        return <Trans>Extensions</Trans>;
      case "Team":
        return <Trans>Team</Trans>;
      case "Billing":
        return <Trans>Billing</Trans>;
      case "Profile":
        return <Trans>Profile</Trans>;
      default:
        return title;
    }
  };

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="mt-2.5 flex items-center gap-2 px-4 py-1">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => setActive("General")}
                className="hover:text-black hover:underline decoration-dotted cursor-pointer"
              >
                <Trans>Settings</Trans>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>
                {renderTranslatedTitle()}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {title === "Templates" && selectedTemplate && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink>
                    {selectedTemplate.title || "Untitled Template"}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6" ref={contentRef}>{children}</div>
    </main>
  );
}
