import Cocoa

class NotificationInstance {
  let payload: NotificationPayload
  let panel: NSPanel
  let clickableView: ClickableView
  private var dismissTimer: DispatchWorkItem?

  var key: String { payload.key }

  var isExpanded: Bool = false
  var isAnimating: Bool = false
  var compactContentView: NSView?
  var expandedContentView: NSView?

  var countdownTimer: Timer?
  var meetingStartTime: Date?
  weak var timerLabel: NSTextField?

  init(payload: NotificationPayload, panel: NSPanel, clickableView: ClickableView) {
    self.payload = payload
    self.panel = panel
    self.clickableView = clickableView

    if let startTime = payload.startTime, startTime > 0 {
      self.meetingStartTime = Date(timeIntervalSince1970: TimeInterval(startTime))
    }
  }

  func toggleExpansion() {
    guard !isAnimating else { return }
    isAnimating = true
    isExpanded.toggle()
    NotificationManager.shared.animateExpansion(notification: self, isExpanded: isExpanded)
  }

  func startCountdown(label: NSTextField) {
    timerLabel = label
    updateCountdown()

    countdownTimer?.invalidate()
    countdownTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
      self?.updateCountdown()
    }
  }

  func stopCountdown() {
    countdownTimer?.invalidate()
    countdownTimer = nil
    timerLabel = nil
  }

  private func updateCountdown() {
    guard let startTime = meetingStartTime, let label = timerLabel else { return }
    let remaining = startTime.timeIntervalSinceNow

    if remaining <= 0 {
      label.stringValue = "Started"
      countdownTimer?.invalidate()
      countdownTimer = nil
    } else {
      let minutes = Int(remaining) / 60
      let seconds = Int(remaining) % 60
      label.stringValue = "Begins in \(minutes):\(String(format: "%02d", seconds))"
    }
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
    stopCountdown()

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
    countdownTimer?.invalidate()
  }
}
