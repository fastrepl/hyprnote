import Cocoa

// MARK: - Configuration

private enum QuitOverlay {
  static let size = NSSize(width: 340, height: 126)
  static let cornerRadius: CGFloat = 12
  static let backgroundColor = NSColor(white: 0.12, alpha: 0.88)

  static let pressText = "Press ⌘Q to Close"
  static let holdText = "Hold ⌘Q to Quit"
  static let font = NSFont.systemFont(ofSize: 22, weight: .medium)
  static let primaryTextColor = NSColor.white
  static let secondaryTextColor = NSColor(white: 1.0, alpha: 0.5)

  static let animationDuration: TimeInterval = 0.15
  static let holdDuration: TimeInterval = 1.0
  static let overlayDuration: TimeInterval = 1.5

  static let progressBarHeight: CGFloat = 4
  static let progressBarInset: CGFloat = 32
  static let progressBarCornerRadius: CGFloat = 2
  static let progressBarTrackColor = NSColor(white: 1.0, alpha: 0.15)
  static let progressBarFillColor = NSColor.white
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
  private var progressFillLayer: CALayer?
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
    let appWindow = NSApplication.shared.windows.first(where: {
      !($0 is NSPanel) && $0.isVisible
    })

    if let windowFrame = appWindow?.frame {
      let origin = NSPoint(
        x: windowFrame.midX - size.width / 2,
        y: windowFrame.midY - size.height / 2
      )
      return NSRect(origin: origin, size: size)
    }

    guard let screen = NSScreen.main ?? NSScreen.screens.first else {
      return NSRect(origin: .zero, size: size)
    }
    let origin = NSPoint(
      x: screen.frame.midX - size.width / 2,
      y: screen.frame.midY - size.height / 2
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

    let progressBarWidth = size.width - QuitOverlay.progressBarInset * 2
    let progressBarY: CGFloat = 18
    let textSpacing: CGFloat = 10
    let barTextSpacing: CGFloat = 14
    let topY = progressBarY + QuitOverlay.progressBarHeight + barTextSpacing + holdLabel.frame.height
      + textSpacing
    let pressX = (size.width - pressLabel.frame.width) / 2

    pressLabel.frame = NSRect(
      x: pressX,
      y: topY,
      width: pressLabel.frame.width,
      height: pressLabel.frame.height
    )
    holdLabel.frame = NSRect(
      x: pressX + prefixDelta,
      y: topY - textSpacing - holdLabel.frame.height,
      width: holdLabel.frame.width,
      height: holdLabel.frame.height
    )

    container.addSubview(pressLabel)
    container.addSubview(holdLabel)

    let trackLayer = CALayer()
    trackLayer.frame = CGRect(
      x: QuitOverlay.progressBarInset,
      y: progressBarY,
      width: progressBarWidth,
      height: QuitOverlay.progressBarHeight
    )
    trackLayer.backgroundColor = QuitOverlay.progressBarTrackColor.cgColor
    trackLayer.cornerRadius = QuitOverlay.progressBarCornerRadius
    trackLayer.masksToBounds = true
    container.layer?.addSublayer(trackLayer)

    let fillLayer = CALayer()
    fillLayer.frame = CGRect(
      x: 0,
      y: 0,
      width: progressBarWidth,
      height: QuitOverlay.progressBarHeight
    )
    fillLayer.backgroundColor = QuitOverlay.progressBarFillColor.cgColor
    fillLayer.cornerRadius = QuitOverlay.progressBarCornerRadius
    fillLayer.anchorPoint = CGPoint(x: 0, y: 0.5)
    fillLayer.position = CGPoint(x: 0, y: QuitOverlay.progressBarHeight / 2)
    fillLayer.transform = CATransform3DMakeScale(0, 1, 1)
    trackLayer.addSublayer(fillLayer)

    self.progressFillLayer = fillLayer

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

  // MARK: - Progress Bar Animation

  private func startProgressAnimation() {
    guard let fillLayer = progressFillLayer else { return }

    fillLayer.removeAnimation(forKey: "progress")

    let animation = CABasicAnimation(keyPath: "transform.scale.x")
    animation.fromValue = 0
    animation.toValue = 1
    animation.duration = QuitOverlay.holdDuration
    animation.timingFunction = CAMediaTimingFunction(name: .linear)
    animation.fillMode = .forwards
    animation.isRemovedOnCompletion = false
    fillLayer.add(animation, forKey: "progress")
  }

  private func resetProgress() {
    guard let fillLayer = progressFillLayer else { return }
    fillLayer.removeAnimation(forKey: "progress")
    fillLayer.transform = CATransform3DMakeScale(0, 1, 1)
  }

  // MARK: - Panel Visibility

  func showOverlay() {
    if panel == nil {
      panel = makePanel()
    }
    guard let panel else { return }

    panel.setFrame(centeredFrame(size: QuitOverlay.size), display: false)
    resetProgress()

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
      self.resetProgress()
    }
  }

  // MARK: - State Machine

  private func onCmdQPressed() {
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
      startProgressAnimation()
      scheduleTimer(&quitTimer, delay: QuitOverlay.holdDuration) { [weak self] in
        self?.performQuit()
      }

    case .holding:
      break
    }
  }

  private func onKeyReleased() {
    switch state {
    case .idle, .awaiting:
      break

    case .holding:
      state = .idle
      cancelTimer(&quitTimer)
      resetProgress()
      performClose()
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
