import type { ActivityLoaderArgs } from "@stackflow/config";
import { AppScreen } from "@stackflow/plugin-basic-ui";
import { ActivityComponentType } from "@stackflow/react/future";
import { UploadIcon } from "lucide-react";

import { useRecordings } from "../components/hooks/use-recordings";
import { RecordingItem } from "../components/recordings/recording-item";
import { localRecordings } from "../mock/recordings";

import { Button } from "@hypr/ui/components/ui/button";

export function recordingsLoader({}: ActivityLoaderArgs<"RecordingsView">) {
  return {
    recordings: localRecordings,
  };
}

export const RecordingsView: ActivityComponentType<"RecordingsView"> = () => {
  const {
    recordings,
    selectedRecordingId,
    groupedRecordings,
    sortedDates,
    handleClickRecording,
    handleConfirmSelection,
    formatDateHeader,
  } = useRecordings();

  return (
    <AppScreen
      appBar={{
        title: "Recordings",
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-20 space-y-6">
          {recordings.length === 0
            ? (
              <div className="flex flex-col justify-center items-center h-64">
                <p className="text-neutral-500 mb-4">No recordings yet</p>
              </div>
            )
            : (
              <>
                {sortedDates.map((dateKey: string) => {
                  const { date, recordings: dateRecordings } = groupedRecordings[dateKey];

                  return (
                    <section key={dateKey} >
                      <h2 className="font-bold text-neutral-600 mb-3">
                        {formatDateHeader(date)}
                      </h2>

                      <div className="space-y-2">
                        {dateRecordings.map((recording) => (
                          <RecordingItem
                            key={recording.id}
                            recording={recording}
                            onSelect={() => handleClickRecording(recording.id)}
                            isSelected={selectedRecordingId === recording.id}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </>
            )}
        </div>

        {selectedRecordingId && (
          <div
            className="fixed z-10 bottom-0 left-0 right-0 flex justify-center px-4 pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              className="w-full py-3 text-lg font-semibold"
              onClick={handleConfirmSelection}
            >
              <UploadIcon size={20} className="mr-2" />Upload Recording
            </Button>
          </div>
        )}
      </div>
    </AppScreen>
  );
};

declare module "@stackflow/config" {
  interface Register {
    RecordingsView: {};
  }
}
