import { type ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@hypr/ui/components/ui/breadcrumb";
import type { Template } from "@/types/tauri.gen";

interface DialogViewProps {
  title: string;
  selectedTemplate: Template | null;
  children: ReactNode;
}

export function DialogView({
  title,
  selectedTemplate,
  children,
}: DialogViewProps) {
  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="mt-2.5 flex items-center gap-2 px-4 py-1">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>Settings</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>{title}</BreadcrumbLink>
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
