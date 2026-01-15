const NATIVE_HOST_NAME = "com.hyprnote.hyprnote";

interface MuteStateMessage {
  type: "MUTE_STATE_CHANGED";
  payload: {
    muted: boolean;
  };
}

interface NativeMessage {
  type: string;
  muted?: boolean;
}

let nativePort: Browser.runtime.Port | null = null;

function connectToNativeHost(): Browser.runtime.Port | null {
  try {
    const port = browser.runtime.connectNative(NATIVE_HOST_NAME);

    port.onMessage.addListener((message: NativeMessage) => {
      console.log("Received from native host:", message);
    });

    port.onDisconnect.addListener(() => {
      console.log("Disconnected from native host");
      const error = browser.runtime.lastError;
      if (error) {
        console.error("Native host error:", error.message);
      }
      nativePort = null;
    });

    console.log("Connected to native host:", NATIVE_HOST_NAME);
    return port;
  } catch (error) {
    console.error("Failed to connect to native host:", error);
    return null;
  }
}

function sendToNativeHost(message: NativeMessage): void {
  if (!nativePort) {
    nativePort = connectToNativeHost();
  }

  if (nativePort) {
    try {
      nativePort.postMessage(message);
    } catch (error) {
      console.error("Failed to send message to native host:", error);
      nativePort = null;
    }
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: MuteStateMessage, _sender, _sendResponse) => {
      if (message.type === "MUTE_STATE_CHANGED") {
        console.log("Mute state changed:", message.payload.muted);
        sendToNativeHost({
          type: "mute_state_changed",
          muted: message.payload.muted,
        });
      }
      return false;
    },
  );

  console.log("Hyprnote extension background script loaded");
});
