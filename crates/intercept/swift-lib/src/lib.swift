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

    let pressLabel = makeLabel(QuitOverlay.pressText, color: QuitOverlay.primaryTextColor)
    let holdLabel = makeLabel(QuitOverlay.holdText, color: QuitOverlay.secondaryTextColor)

    let prefixDelta =
      NSAttributedString(
        string: "Press ", attributes: [.font: QuitOverlay.font]
      ).size().width
      - NSAttributedString(
        string: "Hold ", attributes: [.font: QuitOverlay.font]
      ).size().width

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

  private func makeLabel(_ text: String, color: NSColor) -> NSTextField {
    let label = NSTextField(labelWithString: text)
    label.font = QuitOverlay.font
    label.textColor = color
    label.alignment = .left
    label.sizeToFit()
    return label
  }

  // MARK: - Panel Visibility

  func showOverlay() {
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

  private func onCmdQPressed() {
    switch state {
    case .idle:
      state = .holding
      showOverlay()
      scheduleTimer(&quitTimer, delay: QuitOverlay.holdDuration) { [weak self] in
        self?.performQuit()
      }

    case .holding:
      break

    case .awaiting:
      state = .idle
      cancelTimer(&dismissTimer)
      performClose()
    }
  }

  private func onKeyReleased() {
    switch state {
    case .idle, .awaiting:
      break

    case .holding:
      state = .awaiting
      cancelTimer(&quitTimer)
      scheduleTimer(&dismissTimer, delay: QuitOverlay.overlayDuration) { [weak self] in
        guard let self, self.state == .awaiting else { return }
        self.state = .idle
        self.hidePanel()
      }
    }
  }

  // MARK: - Timer Helpers

  private func scheduleTimer(
    _ timer: inout DispatchWorkItem?, delay: TimeInterval, action: @escaping () -> Void
  ) {
    timer?.cancel()
    let workItem = DispatchWorkItem(block: action)
    timer = workItem
    DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: workItem)
  }

  private func cancelTimer(_ timer: inout DispatchWorkItem?) {
    timer?.cancel()
    timer = nil
  }

  // MARK: - Event Handlers

  private func handleKeyDown(_ event: NSEvent) -> NSEvent? {
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

  private func handleKeyUp(_ event: NSEvent) {
    if event.charactersIgnoringModifiers?.lowercased() == "q" {
      onKeyReleased()
    }
  }

  private func handleFlagsChanged(_ event: NSEvent) {
    let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
    if !flags.contains(.command) {
      onKeyReleased()
    }
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
