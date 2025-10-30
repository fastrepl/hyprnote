import { type ReactNode, useMemo } from "react";

import * as main from "../../../../store/tinybase/main";

export function FolderBreadcrumb(
  {
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
    renderCrumb: (props: { id: string; name: string; isLast: boolean }) => ReactNode;
  },
) {
  const folderChain = useFolderChain(folderId);

  if (folderChain.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-row items-center gap-1">
      {renderBefore?.()}
      {folderChain.map((id, index) => (
        <div key={id} className="flex flex-row items-center gap-1">
          {renderSeparator
            ? renderSeparator({ index })
            : ((index > 0 || renderBefore) ? <span>/</span> : null)}
          <FolderWrapper folderId={id}>
            {({ id, name, isLast }) => {
              return renderCrumb({ id, name, isLast });
            }}
          </FolderWrapper>
        </div>
      ))}
      {renderAfter?.()}
    </div>
  );
}

function FolderWrapper(
  {
    folderId,
    children,
  }: {
    folderId: string;
    children: (props: { id: string; name: string; isLast: boolean }) => ReactNode;
  },
) {
  const name = main.UI.useCell("folders", folderId, "name", main.STORE_ID);
  return <>{children({ id: folderId, name: name ?? "Untitled", isLast: false })}</>;
}

export function useFolderChain(folderId: string) {
  const folderIds = main.UI.useLinkedRowIds(
    "folderToParentFolder",
    folderId,
    main.STORE_ID,
  );

  return useMemo(() => {
    if (!folderIds || folderIds.length === 0) {
      return [] as string[];
    }

    return [...folderIds].reverse();
  }, [folderIds]);
}
