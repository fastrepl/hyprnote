import Cocoa

enum ParticipantStatus {
  case accepted
  case maybe
  case declined

  var icon: String {
    switch self {
    case .accepted: return "✓"
    case .maybe: return "?"
    case .declined: return "✗"
    }
  }

  var color: NSColor {
    switch self {
    case .accepted: return NSColor.systemGreen
    case .maybe: return NSColor.systemYellow
    case .declined: return NSColor.systemRed
    }
  }
}

class ClickableView: NSView {
  var trackingArea: NSTrackingArea?
  var isHovering = false
  var onHover: ((Bool) -> Void)?
  weak var notification: NotificationInstance?

  override init(frame frameRect: NSRect) {
    super.init(frame: frameRect)
    setupView()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setupView()
  }

  private func setupView() {
    wantsLayer = true
    layer?.backgroundColor = NSColor.clear.cgColor
  }

  override func updateTrackingAreas() {
    super.updateTrackingAreas()
    for area in trackingAreas { removeTrackingArea(area) }
    trackingArea = nil

    let options: NSTrackingArea.Options = [
      .activeAlways, .mouseEnteredAndExited, .mouseMoved, .inVisibleRect, .enabledDuringMouseDrag,
    ]

    let area = NSTrackingArea(rect: bounds, options: options, owner: self, userInfo: nil)
    addTrackingArea(area)
    trackingArea = area

    updateHoverStateFromCurrentMouseLocation()
  }

  private func updateHoverStateFromCurrentMouseLocation() {
    guard let win = window else { return }
    let global = win.mouseLocationOutsideOfEventStream
    let local = convert(global, from: nil)
    let inside = bounds.contains(local)
    if inside != isHovering {
      isHovering = inside
      onHover?(inside)
    }
  }

  override func mouseEntered(with event: NSEvent) {
    super.mouseEntered(with: event)
    isHovering = true
    onHover?(true)
  }

  override func mouseExited(with event: NSEvent) {
    super.mouseExited(with: event)
    isHovering = false
    NSCursor.arrow.set()
    onHover?(false)
  }

  override func mouseMoved(with event: NSEvent) {
    super.mouseMoved(with: event)
    let location = convert(event.locationInWindow, from: nil)
    let isInside = bounds.contains(location)
    if isInside != isHovering {
      isHovering = isInside
      onHover?(isInside)
    }
  }

  override func mouseDown(with event: NSEvent) {
    alphaValue = 0.95
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { self.alphaValue = 1.0 }
    if let notification = notification {
      notification.key.withCString { keyPtr in
        rustOnNotificationConfirm(keyPtr)
      }
      notification.dismiss()
    }
  }

  override func viewDidMoveToWindow() {
    super.viewDidMoveToWindow()
    if window != nil { updateTrackingAreas() }
  }
}

class CloseButton: NSButton {
  weak var notification: NotificationInstance?
  var trackingArea: NSTrackingArea?

  static let buttonSize: CGFloat = 20
  static let symbolPointSize: CGFloat = 9

  override init(frame frameRect: NSRect) {
    super.init(frame: frameRect)
    setup()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setup()
  }

  private func setup() {
    wantsLayer = true
    isBordered = false
    bezelStyle = .regularSquare
    imagePosition = .imageOnly
    imageScaling = .scaleProportionallyDown

    if #available(macOS 11.0, *) {
      let cfg = NSImage.SymbolConfiguration(pointSize: Self.symbolPointSize, weight: .medium)
      image = NSImage(systemSymbolName: "xmark", accessibilityDescription: "Close")?
        .withSymbolConfiguration(cfg)
    } else {
      image = NSImage(named: NSImage.stopProgressTemplateName)
    }
    contentTintColor = NSColor.black.withAlphaComponent(0.6)

    layer?.cornerRadius = Self.buttonSize / 2
    layer?.backgroundColor = NSColor.white.cgColor
    layer?.borderColor = NSColor.black.withAlphaComponent(0.1).cgColor
    layer?.borderWidth = 0.5

    layer?.shadowColor = NSColor.black.cgColor
    layer?.shadowOpacity = 0.2
    layer?.shadowOffset = CGSize(width: 0, height: 1)
    layer?.shadowRadius = 3

    layer?.zPosition = 1000

    alphaValue = 0
    isHidden = true
  }

  override var intrinsicContentSize: NSSize {
    NSSize(width: Self.buttonSize, height: Self.buttonSize)
  }

  override func updateTrackingAreas() {
    super.updateTrackingAreas()
    if let area = trackingArea { removeTrackingArea(area) }
    let area = NSTrackingArea(
      rect: bounds,
      options: [.activeAlways, .mouseEnteredAndExited, .inVisibleRect],
      owner: self,
      userInfo: nil
    )
    addTrackingArea(area)
    trackingArea = area
  }

  override func mouseDown(with event: NSEvent) {
    layer?.backgroundColor = NSColor(calibratedWhite: 0.9, alpha: 1.0).cgColor
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
      self.layer?.backgroundColor = NSColor.white.cgColor
    }
    notification?.dismissWithUserAction()
  }

  override func mouseEntered(with event: NSEvent) {
    super.mouseEntered(with: event)
    NSCursor.pointingHand.push()
    layer?.backgroundColor = NSColor(calibratedWhite: 0.95, alpha: 1.0).cgColor
  }

  override func mouseExited(with event: NSEvent) {
    super.mouseExited(with: event)
    NSCursor.pop()
    layer?.backgroundColor = NSColor.white.cgColor
  }
}

class ActionButton: NSButton {
  weak var notification: NotificationInstance?

  override init(frame frameRect: NSRect) {
    super.init(frame: frameRect)
    setup()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setup()
  }

  private func setup() {
    wantsLayer = true
    isBordered = false
    bezelStyle = .rounded
    controlSize = .small
    font = NSFont.systemFont(ofSize: 12, weight: .medium)
    focusRingType = .none

    contentTintColor = NSColor(calibratedWhite: 0.1, alpha: 1.0)
    if #available(macOS 11.0, *) {
      bezelColor = NSColor(calibratedWhite: 0.9, alpha: 1.0)
    }

    layer?.cornerRadius = 8
    layer?.backgroundColor = NSColor(calibratedWhite: 0.95, alpha: 0.9).cgColor
    layer?.borderColor = NSColor(calibratedWhite: 0.7, alpha: 0.5).cgColor
    layer?.borderWidth = 0.5

    layer?.shadowColor = NSColor(calibratedWhite: 0.0, alpha: 0.5).cgColor
    layer?.shadowOpacity = 0.2
    layer?.shadowRadius = 2
    layer?.shadowOffset = CGSize(width: 0, height: 1)
  }

  override var intrinsicContentSize: NSSize {
    var s = super.intrinsicContentSize
    s.width += 12
    s.height = max(24, s.height + 2)
    return s
  }

  override func mouseDown(with event: NSEvent) {
    layer?.backgroundColor = NSColor(calibratedWhite: 0.85, alpha: 0.9).cgColor
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
      self.layer?.backgroundColor = NSColor(calibratedWhite: 0.95, alpha: 0.9).cgColor
    }
    if let notification = notification {
      notification.key.withCString { keyPtr in
        rustOnNotificationAccept(keyPtr)
      }
      notification.dismiss()
    }
  }
}

class DetailsButton: NSButton {
  weak var notification: NotificationInstance?

  override init(frame frameRect: NSRect) {
    super.init(frame: frameRect)
    setup()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setup()
  }

  private func setup() {
    wantsLayer = true
    isBordered = false
    bezelStyle = .rounded
    controlSize = .small
    font = NSFont.systemFont(ofSize: 12, weight: .medium)
    focusRingType = .none

    contentTintColor = NSColor(calibratedWhite: 0.1, alpha: 1.0)
    if #available(macOS 11.0, *) {
      bezelColor = NSColor(calibratedWhite: 0.9, alpha: 1.0)
    }

    layer?.cornerRadius = 8
    layer?.backgroundColor = NSColor(calibratedWhite: 0.95, alpha: 0.9).cgColor
    layer?.borderColor = NSColor(calibratedWhite: 0.7, alpha: 0.5).cgColor
    layer?.borderWidth = 0.5

    layer?.shadowColor = NSColor(calibratedWhite: 0.0, alpha: 0.5).cgColor
    layer?.shadowOpacity = 0.2
    layer?.shadowRadius = 2
    layer?.shadowOffset = CGSize(width: 0, height: 1)
  }

  override var intrinsicContentSize: NSSize {
    var s = super.intrinsicContentSize
    s.width += 12
    s.height = max(24, s.height + 2)
    return s
  }

  override func mouseDown(with event: NSEvent) {
    layer?.backgroundColor = NSColor(calibratedWhite: 0.85, alpha: 0.9).cgColor
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
      self.layer?.backgroundColor = NSColor(calibratedWhite: 0.95, alpha: 0.9).cgColor
    }
    notification?.toggleExpansion()
  }
}
