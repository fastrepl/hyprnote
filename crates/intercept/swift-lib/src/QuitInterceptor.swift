import Cocoa

final class QuitInterceptor {
  static let shared = QuitInterceptor()

  enum State {
    case idle
    case awaiting
    case holding
  }

  var keyMonitor: Any?
  var panel: NSPanel?
  var state: State = .idle
  var dismissTimer: DispatchWorkItem?
  var quitTimer: DispatchWorkItem?

  // MARK: - Setup

  func setup() {
    keyMonitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .keyUp, .flagsChanged]) {
      [weak self] event in
      guard let self else { return event }

      switch event.type {
      case .keyDown:
        return self.handleKeyDown(event)
      case .keyUp:
        self.handleKeyUp(event)
        return event
      case .flagsChanged:
        self.handleFlagsChanged(event)
        return event
      default:
        return event
      }
    }
  }

  // MARK: - Actions

  func performQuit() {
    rustSetForceQuit()
    hidePanel()
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
      NSApplication.shared.terminate(nil)
    }
  }

  func performClose() {
    hidePanel()
    rustPerformClose()
  }

  // MARK: - State Machine

  func onCmdQPressed() {
    switch state {
    case .idle:
      state = .awaiting
      showOverlay()
      scheduleTimer(&dismissTimer, delay: QuitOverlay.overlayDuration) { [weak self] in
        guard let self, self.state == .awaiting else { return }
        self.state = .idle
        self.hidePanel()
      }

    case .awaiting:
      state = .holding
      cancelTimer(&dismissTimer)
      scheduleTimer(&quitTimer, delay: QuitOverlay.holdDuration) { [weak self] in
        self?.performQuit()
      }

    case .holding:
      break
    }
  }

  func onKeyReleased() {
    switch state {
    case .idle, .awaiting:
      break

    case .holding:
      state = .idle
      cancelTimer(&quitTimer)
      performClose()
    }
  }

  // MARK: - Timer Helpers

  func scheduleTimer(
    _ timer: inout DispatchWorkItem?, delay: TimeInterval, action: @escaping () -> Void
  ) {
    timer?.cancel()
    let workItem = DispatchWorkItem(block: action)
    timer = workItem
    DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: workItem)
  }

  func cancelTimer(_ timer: inout DispatchWorkItem?) {
    timer?.cancel()
    timer = nil
  }

  // MARK: - Event Handlers

  func handleKeyDown(_ event: NSEvent) -> NSEvent? {
    let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
    let isQ = event.charactersIgnoringModifiers?.lowercased() == "q"
    guard flags.contains(.command), isQ else { return event }

    if flags.contains(.shift) {
      performQuit()
      return nil
    }

    if event.isARepeat { return nil }
    onCmdQPressed()
    return nil
  }

  func handleKeyUp(_ event: NSEvent) {
    if event.charactersIgnoringModifiers?.lowercased() == "q" {
      onKeyReleased()
    }
  }

  func handleFlagsChanged(_ event: NSEvent) {
    let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
    if !flags.contains(.command) {
      onKeyReleased()
    }
  }
}
