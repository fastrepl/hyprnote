import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, TrashIcon } from "lucide-react";
import { useCallback } from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { DropdownMenuItem } from "@hypr/ui/components/ui/dropdown-menu";
import { cn } from "@hypr/utils";

import * as main from "../../../../../../store/tinybase/main";

export function DeleteNote({ sessionId }: { sessionId: string }) {
  const deleteRow = main.UI.useDelRowCallback(
    "sessions",
    sessionId,
    main.STORE_ID,
  );

  const handleDeleteNote = useCallback(() => {
    deleteRow();
    void miscCommands.audioDelete(sessionId);
  }, [sessionId, deleteRow]);

  return (
    <DropdownMenuItem
      onClick={handleDeleteNote}
      className="text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
    >
      <TrashIcon />
      <span>Delete note</span>
    </DropdownMenuItem>
  );
}

export function DeleteRecording({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const { mutate, isPending, isError } = useMutation({
    mutationFn: async () => {
      await Promise.all([
        new Promise((resolve) => setTimeout(resolve, 300)),
        miscCommands.audioDelete(sessionId).then((result) => {
          if (result.status === "error") {
            throw new Error(result.error);
          }

          return result.data;
        }),
      ]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.length >= 2 &&
          query.queryKey[0] === "audio" &&
          query.queryKey[1] === sessionId,
      });
    },
  });

  return (
    <DropdownMenuItem
      onClick={(e) => {
        e.preventDefault();
        mutate();
      }}
      disabled={isPending}
      className={cn([
        "cursor-pointer",
        isError
          ? "text-orange-600 hover:bg-orange-50 hover:text-orange-700"
          : "text-red-600 hover:bg-red-50 hover:text-red-700",
      ])}
    >
      {isPending ? <Loader2Icon className="animate-spin" /> : <TrashIcon />}
      <span>
        {isPending
          ? "Deleting..."
          : isError
            ? "Failed to delete"
            : "Delete only recording"}
      </span>
    </DropdownMenuItem>
  );
}
