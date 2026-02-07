import Cocoa

// MARK: - Configuration

private enum QuitOverlay {
  static let size = NSSize(width: 340, height: 52)
  static let cornerRadius: CGFloat = 12
  static let verticalOffsetRatio: CGFloat = 0.15
  static let backgroundColor = NSColor(white: 0.12, alpha: 0.88)

  static let text = "Hold ⌘Q to Quit"
  static let font = NSFont.systemFont(ofSize: 22, weight: .medium)
  static let textColor = NSColor.white

  static let animationDuration: TimeInterval = 0.15
  static let holdDuration: TimeInterval = 1.5
  static let lingerDuration: TimeInterval = 0.75
}

// MARK: - FFI

@_silgen_name("rust_set_force_quit")
func rustSetForceQuit()

// MARK: - QuitInterceptor

private final class QuitInterceptor {
  static let shared = QuitInterceptor()

  private var keyMonitor: Any?
  private var panel: NSPanel?
  private var quitTimer: DispatchWorkItem?
  private var hideTimer: DispatchWorkItem?
  private var recentQuitAttempt = false

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

  // MARK: - Quit

  private func performQuit() {
    quitTimer?.cancel()
    hideTimer?.cancel()
    rustSetForceQuit()
    hidePanel()
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
      NSApplication.shared.terminate(nil)
    }
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
    guard let screen = NSScreen.main else {
      fatalError("No main screen")
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

    let label = NSTextField(labelWithString: QuitOverlay.text)
    label.font = QuitOverlay.font
    label.textColor = QuitOverlay.textColor
    label.alignment = .center
    label.sizeToFit()
    label.frame = NSRect(
      x: (size.width - label.frame.width) / 2,
      y: (size.height - label.frame.height) / 2,
      width: label.frame.width,
      height: label.frame.height
    )

    container.addSubview(label)
    return container
  }

  // MARK: - Show / Hide

  private func showPanel() {
    hideTimer?.cancel()
    hideTimer = nil

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

  // MARK: - Timers

  private func startQuitTimer() {
    quitTimer?.cancel()

    let timer = DispatchWorkItem { [weak self] in
      self?.performQuit()
    }
    quitTimer = timer
    DispatchQueue.main.asyncAfter(deadline: .now() + QuitOverlay.holdDuration, execute: timer)
  }

  private func cancelQuitTimer() {
    quitTimer?.cancel()
    quitTimer = nil
    recentQuitAttempt = true
    scheduleHide()
  }

  private func scheduleHide() {
    hideTimer?.cancel()

    let timer = DispatchWorkItem { [weak self] in
      self?.recentQuitAttempt = false
      self?.hidePanel()
    }
    hideTimer = timer
    DispatchQueue.main.asyncAfter(deadline: .now() + QuitOverlay.lingerDuration, execute: timer)
  }

  // MARK: - Event Handlers

  private func handleKeyDown(_ event: NSEvent) -> NSEvent? {
    let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
    let isQ = event.charactersIgnoringModifiers?.lowercased() == "q"

    guard flags.contains(.command), isQ, !event.isARepeat else {
      return event
    }

    if recentQuitAttempt {
      performQuit()
      return nil
    }

    showPanel()
    startQuitTimer()
    return nil
  }

  private func handleKeyUp(_ event: NSEvent) {
    let isQ = event.charactersIgnoringModifiers?.lowercased() == "q"
    if isQ {
      cancelQuitTimer()
    }
  }

  private func handleFlagsChanged(_ event: NSEvent) {
    let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
    if !flags.contains(.command) && quitTimer != nil {
      cancelQuitTimer()
    }
  }
}

// MARK: - Entry Point

@_cdecl("_setup_force_quit_handler")
public func _setupForceQuitHandler() {
  QuitInterceptor.shared.setup()
}
