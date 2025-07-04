export interface MicrophoneDeviceInfo {
  devices: string[];
  selected: string | null;
}

export interface DeviceData {
  devices: string[];
  selected?: string[];
}

export function parseDeviceData(result: string | null | undefined): DeviceData | null {
  if (!result || !result.startsWith("DEVICES:")) {
    return null;
  }

  const devicesJson = result.substring(8);
  try {
    const parsedData = JSON.parse(devicesJson);

    // Check if it's the new format with devices and selected
    if (parsedData && typeof parsedData === "object" && parsedData.devices) {
      return parsedData;
    }

    // Fallback to old format (array of devices)
    if (Array.isArray(parsedData)) {
      return { devices: parsedData };
    }

    return null;
  } catch (e) {
    console.error("Failed to parse device data:", e);
    return null;
  }
}

export function isDeviceData(data: unknown): data is DeviceData {
  return (
    typeof data === "object"
    && data !== null
    && "devices" in data
    && Array.isArray((data as DeviceData).devices)
    && (data as DeviceData).devices.every(d => typeof d === "string")
  );
}

export function isMicrophoneDeviceInfo(data: unknown): data is MicrophoneDeviceInfo {
  return (
    typeof data === "object"
    && data !== null
    && "devices" in data
    && Array.isArray((data as MicrophoneDeviceInfo).devices)
    && (data as MicrophoneDeviceInfo).devices.every(d => typeof d === "string")
    && ("selected" in data
      && (typeof (data as MicrophoneDeviceInfo).selected === "string"
        || (data as MicrophoneDeviceInfo).selected === null))
  );
}
