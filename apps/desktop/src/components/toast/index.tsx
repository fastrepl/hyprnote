import ModelDownloadNotification from "./model-download";
import OtaNotification from "./ota";

interface NotificationsProps {
  showAll?: boolean;
}

export default function Notifications({ showAll = false }: NotificationsProps) {
  return (
    <>
      <OtaNotification />
      {showAll && <ModelDownloadNotification />}
    </>
  );
}
