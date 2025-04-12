import { useLingui } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { confirm } from "@tauri-apps/plugin-dialog";
import { Trash2 } from "lucide-react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { useSession } from "@hypr/utils/contexts";

export function DeleteNoteButton() {
  const param = useParams({ from: "/app/note/$id", shouldThrow: false });
  return param ? <DeleteNoteButtonInNote /> : null;
}

function DeleteNoteButtonInNote() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const param = useParams({ from: "/app/note/$id", shouldThrow: true });

  const hasContent = useSession(
    param.id,
    (s) =>
      !!s.session?.title
      || !!s.session?.raw_memo_html
      || !!s.session?.enhanced_memo_html,
  );

  const deleteMutation = useMutation({
    mutationFn: () => dbCommands.deleteSession(param.id),
    onSuccess: () => {
      navigate({ to: "/app/new" });
    },
  });

  const handleDelete = () => {
    confirm(t`Are you sure you want to delete this note?`).then((yes) => {
      if (yes) {
        deleteMutation.mutate();
      }
    });
  };

  return (
    <Button
      disabled={!hasContent}
      variant="ghost"
      size="icon"
      className="hover:bg-neutral-200"
      aria-label="Delete Note"
      onClick={handleDelete}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
