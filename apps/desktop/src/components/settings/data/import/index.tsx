import { open } from "@tauri-apps/plugin-dialog";
import { UploadIcon } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";

export function Import() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleSelectFile = useCallback(async () => {
    const selected = await open({
      multiple: false,
      directory: false,
    });

    if (selected) {
      setSelectedFile(selected);
    }
  }, []);

  return (
    <div className="space-y-6 mt-4">
      <div className="flex flex-col gap-3">
        <h3 className="text-md font-semibold">Import Data</h3>
        <p className="text-sm text-neutral-600">
          Select a file to import data into Hyprnote.
        </p>

        <div className="flex flex-col gap-4 p-4 rounded-xl border bg-neutral-50">
          <Button
            onClick={handleSelectFile}
            variant="outline"
            className="w-fit gap-2"
          >
            <UploadIcon size={16} />
            Select File
          </Button>

          {selectedFile && (
            <div className="text-sm text-neutral-600">
              <span className="font-medium">Selected:</span> {selectedFile}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
