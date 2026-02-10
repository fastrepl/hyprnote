import { useMemo } from "react";

import { useConfigValue } from "../../../config/use-config";
import * as settings from "../../../store/tinybase/store/settings";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "./searchable-select";

export function RecordingRetentionSelector() {
  const value = useConfigValue("recording_retention_days");
  const setRetentionDays = settings.UI.useSetValueCallback(
    "recording_retention_days",
    (val: number) => val,
    [],
    settings.STORE_ID,
  );

  const options: SearchableSelectOption[] = useMemo(
    () => [
      { value: "0", label: "Never" },
      { value: "7", label: "After 7 days" },
      { value: "30", label: "After 30 days" },
      { value: "90", label: "After 90 days" },
      { value: "180", label: "After 6 months" },
      { value: "365", label: "After 1 year" },
    ],
    [],
  );

  const displayValue = String(value ?? 0);

  const handleChange = (val: string) => {
    setRetentionDays(Number(val));
  };

  return (
    <div className="flex flex-row items-center justify-between">
      <div>
        <h3 className="text-sm font-medium mb-1">Auto-delete recordings</h3>
        <p className="text-xs text-neutral-600">
          Automatically remove old audio recordings to free up disk space
        </p>
      </div>
      <SearchableSelect
        value={displayValue}
        onChange={handleChange}
        options={options}
        placeholder="Select..."
        className="w-56"
      />
    </div>
  );
}
