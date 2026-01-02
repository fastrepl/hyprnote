import Cocoa

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
