import Cocoa

// MARK: - Configuration

private enum QuitOverlay {
  static let size = NSSize(width: 340, height: 96)
  static let cornerRadius: CGFloat = 12
  static let verticalOffsetRatio: CGFloat = 0.15
  static let backgroundColor = NSColor(white: 0.12, alpha: 0.88)

  static let pressText = "Press ⌘Q to Close"
  static let holdText = "Hold ⌘Q to Quit"
  static let font = NSFont.systemFont(ofSize: 22, weight: .medium)
  static let primaryTextColor = NSColor.white
  static let secondaryTextColor = NSColor(white: 1.0, alpha: 0.5)

  static let animationDuration: TimeInterval = 0.15
  static let holdDuration: TimeInterval = 1.0
  static let overlayDuration: TimeInterval = 1.5
}

// MARK: - FFI

@_silgen_name("rust_set_force_quit")
func rustSetForceQuit()

@_silgen_name("rust_perform_close")
func rustPerformClose()

// MARK: - QuitInterceptor

private final class QuitInterceptor {
  static let shared = QuitInterceptor()

  private enum State {
    case idle
    case awaiting
    case holding
  }

  private enum Event {
    case cmdQPressed
    case keyReleased
    case dismissTimerFired
    case quitTimerFired
  }

  private var keyMonitor: Any?
  private var panel: NSPanel?
  private var state: State = .idle
  private var dismissTimer: DispatchWorkItem?
  private var quitTimer: DispatchWorkItem?

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
      case .flagsChanged:
        self.handleFlagsChanged(event)
      default:
        break
      }
      return event
    }
  }

  // MARK: - Actions

  private func performQuit() {
    rustSetForceQuit()
    hidePanel()
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
      NSApplication.shared.terminate(nil)
    }
  }

  private func performClose() {
    hidePanel()
    rustPerformClose()
  }

  // MARK: - Panel Construction

  private func makePanel() -> NSPanel {
    let frame = centeredFrame(size: QuitOverlay.size)

    let panel = NSPanel(
      contentRect: frame,
      styleMask: [.borderless, .nonactivatingPanel],
      backing: .buffered,
      defer: false
    )

    panel.level = .floating
    panel.isFloatingPanel = true
    panel.hidesOnDeactivate = false
    panel.isOpaque = false
    panel.backgroundColor = .clear
    panel.hasShadow = true
    panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .ignoresCycle]
    panel.isMovableByWindowBackground = false
    panel.ignoresMouseEvents = true

    panel.contentView = makeContentView(size: QuitOverlay.size)
    return panel
  }

  private func centeredFrame(size: NSSize) -> NSRect {
    guard let screen = NSScreen.main ?? NSScreen.screens.first else {
      return NSRect(origin: .zero, size: size)
    }
    let origin = NSPoint(
      x: screen.frame.midX - size.width / 2,
      y: screen.frame.midY - size.height / 2 + screen.frame.height * QuitOverlay.verticalOffsetRatio
    )
    return NSRect(origin: origin, size: size)
  }

  private func makeContentView(size: NSSize) -> NSView {
    let container = NSView(frame: NSRect(origin: .zero, size: size))
    container.wantsLayer = true
    container.layer?.backgroundColor = QuitOverlay.backgroundColor.cgColor
    container.layer?.cornerRadius = QuitOverlay.cornerRadius
    container.layer?.masksToBounds = true

    let font = QuitOverlay.font

    let pressLabel = NSTextField(labelWithString: QuitOverlay.pressText)
    pressLabel.font = font
    pressLabel.textColor = QuitOverlay.primaryTextColor
    pressLabel.alignment = .left
    pressLabel.sizeToFit()

    let holdLabel = NSTextField(labelWithString: QuitOverlay.holdText)
    holdLabel.font = font
    holdLabel.textColor = QuitOverlay.secondaryTextColor
    holdLabel.alignment = .left
    holdLabel.sizeToFit()

    let pressPrefixWidth = NSAttributedString(
      string: "Press ", attributes: [.font: font]
    ).size().width
    let holdPrefixWidth = NSAttributedString(
      string: "Hold ", attributes: [.font: font]
    ).size().width
    let prefixDelta = pressPrefixWidth - holdPrefixWidth

    let spacing: CGFloat = 10
    let totalHeight = pressLabel.frame.height + spacing + holdLabel.frame.height
    let topY = (size.height + totalHeight) / 2 - pressLabel.frame.height
    let pressX = (size.width - pressLabel.frame.width) / 2

    pressLabel.frame = NSRect(
      x: pressX,
      y: topY,
      width: pressLabel.frame.width,
      height: pressLabel.frame.height
    )
    holdLabel.frame = NSRect(
      x: pressX + prefixDelta,
      y: topY - spacing - holdLabel.frame.height,
      width: holdLabel.frame.width,
      height: holdLabel.frame.height
    )

    container.addSubview(pressLabel)
    container.addSubview(holdLabel)
    return container
  }

  // MARK: - Show / Hide

  func showOverlay() {
    showPanel()
  }

  private func showPanel() {
    if panel == nil {
      panel = makePanel()
    }
    guard let panel else { return }

    panel.alphaValue = 0
    panel.orderFrontRegardless()

    NSAnimationContext.runAnimationGroup { context in
      context.duration = QuitOverlay.animationDuration
      context.timingFunction = CAMediaTimingFunction(name: .easeOut)
      panel.animator().alphaValue = 1.0
    }
  }

  private func hidePanel() {
    guard let panel else { return }

    NSAnimationContext.runAnimationGroup({ context in
      context.duration = QuitOverlay.animationDuration
      context.timingFunction = CAMediaTimingFunction(name: .easeIn)
      panel.animator().alphaValue = 0
    }) {
      panel.orderOut(nil)
    }
  }

  // MARK: - State Machine

  private func transition(_ event: Event) {
    switch (state, event) {
    case (.idle, .cmdQPressed):
      state = .awaiting
      showPanel()
      startDismissTimer()

    case (.awaiting, .cmdQPressed):
      state = .holding
      cancelDismissTimer()
      startQuitTimer()

    case (.awaiting, .keyReleased):
      break

    case (.awaiting, .dismissTimerFired):
      state = .idle
      hidePanel()

    case (.holding, .keyReleased):
      state = .idle
      cancelQuitTimer()
      performClose()

    case (.holding, .quitTimerFired):
      performQuit()

    default:
      break
    }
  }

  // MARK: - Timers

  private func startDismissTimer() {
    dismissTimer?.cancel()
    let timer = DispatchWorkItem { [weak self] in
      self?.transition(.dismissTimerFired)
    }
    dismissTimer = timer
    DispatchQueue.main.asyncAfter(deadline: .now() + QuitOverlay.overlayDuration, execute: timer)
  }

  private func cancelDismissTimer() {
    dismissTimer?.cancel()
    dismissTimer = nil
  }

  private func startQuitTimer() {
    quitTimer?.cancel()
    let timer = DispatchWorkItem { [weak self] in
      self?.transition(.quitTimerFired)
    }
    quitTimer = timer
    DispatchQueue.main.asyncAfter(deadline: .now() + QuitOverlay.holdDuration, execute: timer)
  }

  private func cancelQuitTimer() {
    quitTimer?.cancel()
    quitTimer = nil
  }

  // MARK: - Event Handlers

  private func handleKeyDown(_ event: NSEvent) -> NSEvent? {
    let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
    let isQ = event.charactersIgnoringModifiers?.lowercased() == "q"
    let isShift = flags.contains(.shift)
    guard flags.contains(.command), !isShift, isQ else { return event }
    if event.isARepeat { return nil }
    transition(.cmdQPressed)
    return nil
  }

  private func handleKeyUp(_ event: NSEvent) {
    let isQ = event.charactersIgnoringModifiers?.lowercased() == "q"
    if isQ { transition(.keyReleased) }
  }

  private func handleFlagsChanged(_ event: NSEvent) {
    let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
    if !flags.contains(.command) { transition(.keyReleased) }
  }
}

// MARK: - Entry Point

@_cdecl("_setup_force_quit_handler")
public func _setupForceQuitHandler() {
  QuitInterceptor.shared.setup()
}

@_cdecl("_show_quit_overlay")
public func _showQuitOverlay() {
  DispatchQueue.main.async {
    QuitInterceptor.shared.showOverlay()
  }
}
