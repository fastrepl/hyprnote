import { type ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@hypr/ui/components/ui/breadcrumb";
import { type Template } from "@hypr/plugin-db";

interface SettingsPanelBodyProps {
  title: string;
  selectedTemplate: Template | null;
  children: ReactNode;
}

export function SettingsPanelBody({
  title,
  selectedTemplate,
  children,
}: SettingsPanelBodyProps) {
  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="mt-2.5 flex items-center gap-2 px-4 py-1">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink className=" hover:text-neutral-200">
                Settings
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink className=" hover:text-neutral-200">
                {title}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {title === "Templates" && selectedTemplate && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink className=" hover:text-neutral-200">
                    {selectedTemplate.title || "Untitled Template"}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">{children}</div>
    </main>
  );
}
