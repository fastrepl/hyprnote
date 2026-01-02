import Cocoa

class NotificationInstance {
  let key: String
  let panel: NSPanel
  let clickableView: ClickableView
  private var dismissTimer: DispatchWorkItem?

  init(key: String, panel: NSPanel, clickableView: ClickableView) {
    self.key = key
    self.panel = panel
    self.clickableView = clickableView
  }

  func startDismissTimer(timeoutSeconds: Double) {
    dismissTimer?.cancel()
    let timer = DispatchWorkItem { [weak self] in
      self?.dismissWithTimeout()
    }
    dismissTimer = timer
    DispatchQueue.main.asyncAfter(deadline: .now() + timeoutSeconds, execute: timer)
  }

  func dismiss() {
    dismissTimer?.cancel()
    dismissTimer = nil

    NSAnimationContext.runAnimationGroup({ context in
      context.duration = 0.2
      context.timingFunction = CAMediaTimingFunction(name: .easeIn)
      self.panel.animator().alphaValue = 0
    }) {
      self.panel.close()
      NotificationManager.shared.removeNotification(self)
    }
  }

  func dismissWithUserAction() {
    self.key.withCString { keyPtr in
      rustOnNotificationDismiss(keyPtr)
    }
    dismiss()
  }

  func dismissWithTimeout() {
    self.key.withCString { keyPtr in
      rustOnNotificationTimeout(keyPtr)
    }
    dismiss()
  }

  deinit {
    dismissTimer?.cancel()
  }
}
