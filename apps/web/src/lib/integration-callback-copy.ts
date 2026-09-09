export function integrationCallbackCopy({
  status,
  disconnectedConnectionId,
}: {
  status: string;
  disconnectedConnectionId?: string;
}) {
  const isDisconnect = Boolean(disconnectedConnectionId);
  const isSuccess = status === "success";

  if (isDisconnect) {
    return {
      title: isSuccess ? "You’re disconnected" : "Disconnect didn’t work",
      description: isSuccess
        ? "Return to Anarlog to keep going."
        : "Something went wrong while disconnecting.",
    };
  }

  return {
    title: isSuccess ? "You’re connected" : "Connection didn’t work",
    description: isSuccess
      ? "Return to Anarlog to keep going."
      : "Something went wrong while connecting.",
  };
}
