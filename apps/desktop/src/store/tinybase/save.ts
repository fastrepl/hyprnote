const SAVE_REQUEST_EVENT = "hypr-save-request";
const SAVE_COMPLETE_EVENT = "hypr-save-complete";

export function requestSave(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      window.removeEventListener(SAVE_COMPLETE_EVENT, handler);
      reject(new Error("Save timeout"));
    }, 5000);

    const handler = (event: Event) => {
      clearTimeout(timeout);
      window.removeEventListener(SAVE_COMPLETE_EVENT, handler);
      const customEvent = event as CustomEvent<{
        success: boolean;
        error?: string;
      }>;
      if (customEvent.detail.success) {
        resolve();
      } else {
        reject(new Error(customEvent.detail.error || "Save failed"));
      }
    };

    window.addEventListener(SAVE_COMPLETE_EVENT, handler);
    window.dispatchEvent(new CustomEvent(SAVE_REQUEST_EVENT));
  });
}

export function onSaveRequest(callback: () => Promise<void>): () => void {
  const handler = async () => {
    try {
      await callback();
      window.dispatchEvent(
        new CustomEvent(SAVE_COMPLETE_EVENT, { detail: { success: true } }),
      );
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent(SAVE_COMPLETE_EVENT, {
          detail: { success: false, error: String(error) },
        }),
      );
    }
  };

  window.addEventListener(SAVE_REQUEST_EVENT, handler);
  return () => window.removeEventListener(SAVE_REQUEST_EVENT, handler);
}
