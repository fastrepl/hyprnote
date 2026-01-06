import { type ReactNode, useMemo } from "react";

import { getFolderName, getFolderPath } from "@hypr/store";

export function FolderBreadcrumb({
  folderId,
  renderBefore,
  renderAfter,
  renderSeparator,
  renderCrumb,
}: {
  folderId: string;
  renderBefore?: () => ReactNode;
  renderAfter?: () => ReactNode;
  renderSeparator?: (props: { index: number }) => ReactNode;
  renderCrumb: (props: {
    id: string;
    name: string;
    isLast: boolean;
  }) => ReactNode;
}) {
  const folderChain = useFolderChain(folderId);

  if (folderChain.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-row items-center gap-1">
      {renderBefore?.()}
      {folderChain.map((id, index) => {
        const name = getFolderName(id);
        const isLast = index === folderChain.length - 1;
        return (
          <div key={id} className="flex flex-row items-center gap-1">
            {renderSeparator ? (
              renderSeparator({ index })
            ) : index > 0 || renderBefore ? (
              <span>/</span>
            ) : null}
            {renderCrumb({ id, name, isLast })}
          </div>
        );
      })}
      {renderAfter?.()}
    </div>
  );
}

export function useFolderChain(folderId: string) {
  return useMemo(() => {
    if (!folderId) {
      return [] as string[];
    }

    const pathParts = getFolderPath(folderId);
    const chain: string[] = [];
    let currentPath = "";

    for (const part of pathParts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      chain.push(currentPath);
    }

    return chain;
  }, [folderId]);
}
