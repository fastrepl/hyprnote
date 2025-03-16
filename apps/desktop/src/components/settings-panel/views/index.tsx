import { type ReactNode } from "react";

import { type Template } from "@hypr/plugin-db";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@hypr/ui/components/ui/breadcrumb";
import { data } from "../constants";
import { type NavNames } from "../types";

interface SettingsPanelBodyProps {
  title: string;
  selectedTemplate: Template | null;
  children: ReactNode;
  setActive: (name: NavNames | "Profile") => void;
}

export function SettingsPanelBody({
  title,
  selectedTemplate,
  children,
  setActive,
}: SettingsPanelBodyProps) {
  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="mt-2.5 flex items-center gap-2 px-4 py-1">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => setActive(data.nav[0].name)}
                className="hover:text-black hover:underline decoration-dotted cursor-pointer"
              >
                Settings
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>
                {title}
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

      <div className="flex-1 overflow-y-auto px-4 py-6">{children}</div>
    </main>
  );
}
