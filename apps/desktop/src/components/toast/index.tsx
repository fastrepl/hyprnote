import ModelDownloadNotification from "./model-download";
import OtaNotification from "./ota";

export default function Notifications() {
  return (
    <>
      <OtaNotification />
      <ModelDownloadNotification />
    </>
  );
}
