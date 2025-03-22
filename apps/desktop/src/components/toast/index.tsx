import ModelDownloadNotification from "./model";
import OtaNotification from "./ota";

export default function Notifications() {
  return (
    <>
      <OtaNotification />
      <ModelDownloadNotification />
    </>
  );
}
