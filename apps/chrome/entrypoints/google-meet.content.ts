const NATIVE_HOST_NAME = "com.hyprnote.hyprnote";

interface MuteState {
  muted: boolean;
}

function sendMuteState(muted: boolean): void {
  const message: MuteState = { muted };
  browser.runtime.sendMessage({ type: "MUTE_STATE_CHANGED", payload: message });
}

function getMuteButtonState(): boolean | null {
  const muteButton = document.querySelector(
    '[data-is-muted="true"], [data-is-muted="false"]',
  );
  if (muteButton) {
    return muteButton.getAttribute("data-is-muted") === "true";
  }

  const ariaButton = document.querySelector(
    'button[aria-label*="microphone"], button[aria-label*="Mute"], button[aria-label*="Unmute"]',
  );
  if (ariaButton) {
    const ariaLabel = ariaButton.getAttribute("aria-label") || "";
    if (
      ariaLabel.includes("Unmute") ||
      ariaLabel.includes("Turn on microphone")
    ) {
      return true;
    }
    if (ariaLabel.includes("Mute") || ariaLabel.includes("Turn off")) {
      return false;
    }
  }

  const muteIcon = document.querySelector(
    '[data-icon-name="mic_off"], [data-icon-name="mic"]',
  );
  if (muteIcon) {
    return muteIcon.getAttribute("data-icon-name") === "mic_off";
  }

  return null;
}

function observeMuteState(): void {
  let lastMuteState: boolean | null = null;

  const checkMuteState = (): void => {
    const currentState = getMuteButtonState();
    if (currentState !== null && currentState !== lastMuteState) {
      lastMuteState = currentState;
      sendMuteState(currentState);
    }
  };

  checkMuteState();

  const observer = new MutationObserver(() => {
    checkMuteState();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-label", "data-is-muted", "data-icon-name"],
  });

  setInterval(checkMuteState, 1000);
}

export default defineContentScript({
  matches: ["https://meet.google.com/*"],
  runAt: "document_idle",
  main() {
    if (
      window.location.pathname.length > 1 &&
      !window.location.pathname.startsWith("/lookup")
    ) {
      observeMuteState();
    }
  },
});
