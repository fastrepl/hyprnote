import AVFoundation
import Cocoa
import SwiftRs

// Store panel reference to prevent deallocation
private var sharedPanel: NSPanel?
private var sharedUrl: String?

class ClickableView: NSView {
  var trackingArea: NSTrackingArea?
  var isHovering = false
  var onHover: ((Bool) -> Void)?

  override func updateTrackingAreas() {
    super.updateTrackingAreas()

    if let existingArea = trackingArea {
      removeTrackingArea(existingArea)
    }

    let options: NSTrackingArea.Options = [
      .activeAlways,
      .mouseEnteredAndExited,
      .inVisibleRect,
    ]

    trackingArea = NSTrackingArea(rect: bounds, options: options, owner: self, userInfo: nil)
    if let area = trackingArea {
      addTrackingArea(area)
    }
  }

  override func mouseEntered(with event: NSEvent) {
    isHovering = true
    NSCursor.pointingHand.set()
    onHover?(true)
  }

  override func mouseExited(with event: NSEvent) {
    isHovering = false
    NSCursor.arrow.set()
    onHover?(false)
  }

  override func mouseDown(with event: NSEvent) {
    // Visual feedback
    alphaValue = 0.95
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
      self.alphaValue = 1.0
    }

    // Open URL if provided
    if let urlString = sharedUrl, let url = URL(string: urlString) {
      NSWorkspace.shared.open(url)
    }

    dismissNotification()
  }
}

class CloseButton: NSButton {
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
    layer?.cornerRadius = 8
    layer?.backgroundColor = NSColor(white: 0.5, alpha: 0.3).cgColor
    isBordered = false

    // Set styled title with color
    let attributes: [NSAttributedString.Key: Any] = [
      .font: NSFont.systemFont(ofSize: 12, weight: .medium),
      .foregroundColor: NSColor(white: 0.9, alpha: 0.9),
    ]
    attributedTitle = NSAttributedString(string: "✕", attributes: attributes)
    alphaValue = 0
  }

  override func mouseDown(with event: NSEvent) {
    dismissNotification()
  }
}

func dismissNotification() {
  if let panel = sharedPanel {
    NSAnimationContext.runAnimationGroup({ context in
      context.duration = 0.2
      context.timingFunction = CAMediaTimingFunction(name: .easeIn)
      panel.animator().alphaValue = 0
    }) {
      panel.close()
      sharedPanel = nil
      sharedUrl = nil
    }
  }
}

@_cdecl("_show_notification")
public func _showNotification(
  title: SRString,
  message: SRString,
  url: SRString,
  hasUrl: Bool,
  timeoutSeconds: Double
) -> Bool {
  // Initialize NSApplication if not already initialized
  let app = NSApplication.shared

  // Convert SRString to Swift String
  let titleStr = title.toString()
  let messageStr = message.toString()
  let urlStr = hasUrl ? url.toString() : nil

  // Store URL globally for click handler
  sharedUrl = urlStr

  // Use async to avoid potential deadlocks
  DispatchQueue.main.async {
    // Initialize the app if needed
    if app.delegate == nil {
      app.setActivationPolicy(.regular)
    }

    // Get screen dimensions
    guard let screen = NSScreen.main else { return }
    let screenRect = screen.visibleFrame

    // Notification dimensions
    let notificationWidth: CGFloat = 360
    let notificationHeight: CGFloat = 75
    let rightMargin: CGFloat = 15
    let topMargin: CGFloat = 15

    // Calculate final position (top-right corner)
    let finalXPos = screenRect.maxX - notificationWidth - rightMargin
    let finalYPos = screenRect.maxY - notificationHeight - topMargin

    // Start position (slide in from right)
    let startXPos = screenRect.maxX + 10

    // Create NSPanel
    let panel = NSPanel(
      contentRect: NSRect(
        x: startXPos, y: finalYPos, width: notificationWidth, height: notificationHeight),
      styleMask: [.borderless, .nonactivatingPanel],
      backing: .buffered,
      defer: false
    )

    // Configure panel
    panel.level = .statusBar
    panel.isFloatingPanel = true
    panel.hidesOnDeactivate = false
    panel.isOpaque = false
    panel.backgroundColor = .clear
    panel.hasShadow = true
    panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .transient, .ignoresCycle]
    panel.isMovableByWindowBackground = false
    panel.alphaValue = 0

    // Create clickable content view
    let clickableView = ClickableView(
      frame: NSRect(x: 0, y: 0, width: notificationWidth, height: notificationHeight))
    clickableView.wantsLayer = true

    // Main container
    let container = NSView(frame: clickableView.bounds)
    container.wantsLayer = true
    container.layer?.cornerRadius = 11
    container.layer?.masksToBounds = false

    // Shadow for depth
    container.layer?.shadowColor = NSColor.black.cgColor
    container.layer?.shadowOpacity = 0.2
    container.layer?.shadowOffset = CGSize(width: 0, height: 2)
    container.layer?.shadowRadius = 10

    // Visual effect view for background
    let effectView = NSVisualEffectView(frame: container.bounds)
    effectView.material = .hudWindow  // Dark translucent material
    effectView.state = .active
    effectView.blendingMode = .behindWindow
    effectView.wantsLayer = true
    effectView.layer?.cornerRadius = 11
    effectView.layer?.masksToBounds = true
    container.addSubview(effectView)

    // Add subtle border for definition
    let borderLayer = CALayer()
    borderLayer.frame = effectView.bounds
    borderLayer.cornerRadius = 11
    borderLayer.borderWidth = 0.5
    borderLayer.borderColor = NSColor(white: 1.0, alpha: 0.05).cgColor
    effectView.layer?.addSublayer(borderLayer)

    // Content stack
    let contentStack = NSStackView()
    contentStack.orientation = .horizontal
    contentStack.alignment = .centerY
    contentStack.spacing = 12
    contentStack.translatesAutoresizingMaskIntoConstraints = false
    effectView.addSubview(contentStack)

    NSLayoutConstraint.activate([
      contentStack.leadingAnchor.constraint(equalTo: effectView.leadingAnchor, constant: 14),
      contentStack.trailingAnchor.constraint(equalTo: effectView.trailingAnchor, constant: -14),
      contentStack.centerYAnchor.constraint(equalTo: effectView.centerYAnchor),
    ])

    // Icon placeholder - REPLACE THIS WITH YOUR SVG/PNG
    let iconContainer = NSView()
    iconContainer.wantsLayer = true
    iconContainer.layer?.cornerRadius = 10
    iconContainer.widthAnchor.constraint(equalToConstant: 42).isActive = true
    iconContainer.heightAnchor.constraint(equalToConstant: 42).isActive = true

    // Simple gradient background for now
    let gradientLayer = CAGradientLayer()
    gradientLayer.frame = CGRect(x: 0, y: 0, width: 42, height: 42)
    gradientLayer.cornerRadius = 10
    gradientLayer.colors =
      urlStr != nil
      ? [NSColor.systemBlue.cgColor, NSColor(red: 0.2, green: 0.4, blue: 0.8, alpha: 1).cgColor]
      : [NSColor.systemGreen.cgColor, NSColor(red: 0.2, green: 0.6, blue: 0.4, alpha: 1).cgColor]
    gradientLayer.startPoint = CGPoint(x: 0, y: 0)
    gradientLayer.endPoint = CGPoint(x: 1, y: 1)
    iconContainer.layer?.addSublayer(gradientLayer)

    // Temporary emoji icon - REPLACE WITH NSImageView for your SVG/PNG
    let tempIcon = NSTextField(labelWithString: urlStr != nil ? "🔗" : "🔔")
    tempIcon.font = NSFont.systemFont(ofSize: 20)
    tempIcon.textColor = .white
    tempIcon.alignment = .center
    tempIcon.translatesAutoresizingMaskIntoConstraints = false
    iconContainer.addSubview(tempIcon)
    NSLayoutConstraint.activate([
      tempIcon.centerXAnchor.constraint(equalTo: iconContainer.centerXAnchor),
      tempIcon.centerYAnchor.constraint(equalTo: iconContainer.centerYAnchor),
    ])

    /* TO USE YOUR OWN ICON, REPLACE THE ABOVE WITH:
    let iconImageView = NSImageView()
    iconImageView.image = NSImage(named: "your-icon-name") // or load from path
    iconImageView.imageScaling = .scaleProportionallyUpOrDown
    iconImageView.translatesAutoresizingMaskIntoConstraints = false
    iconContainer.addSubview(iconImageView)
    NSLayoutConstraint.activate([
      iconImageView.centerXAnchor.constraint(equalTo: iconContainer.centerXAnchor),
      iconImageView.centerYAnchor.constraint(equalTo: iconContainer.centerYAnchor),
      iconImageView.widthAnchor.constraint(equalToConstant: 24),
      iconImageView.heightAnchor.constraint(equalToConstant: 24)
    ])
    */

    contentStack.addArrangedSubview(iconContainer)

    // Text container
    let textStack = NSStackView()
    textStack.orientation = .vertical
    textStack.alignment = .leading
    textStack.spacing = 2

    // Title
    let titleLabel = NSTextField(labelWithString: titleStr)
    titleLabel.font = NSFont.systemFont(ofSize: 13, weight: .semibold)
    titleLabel.textColor = NSColor.labelColor
    titleLabel.backgroundColor = .clear
    titleLabel.isBezeled = false
    titleLabel.isEditable = false
    titleLabel.lineBreakMode = .byTruncatingTail
    titleLabel.maximumNumberOfLines = 1
    textStack.addArrangedSubview(titleLabel)

    // Message
    let messageLabel = NSTextField(labelWithString: messageStr)
    messageLabel.font = NSFont.systemFont(ofSize: 12, weight: .regular)
    messageLabel.textColor = NSColor.secondaryLabelColor
    messageLabel.backgroundColor = .clear
    messageLabel.isBezeled = false
    messageLabel.isEditable = false
    messageLabel.lineBreakMode = .byTruncatingTail
    messageLabel.maximumNumberOfLines = 2
    textStack.addArrangedSubview(messageLabel)

    contentStack.addArrangedSubview(textStack)

    // Add close button
    let closeButton = CloseButton(frame: NSRect(x: 0, y: 0, width: 24, height: 24))
    closeButton.translatesAutoresizingMaskIntoConstraints = false
    effectView.addSubview(closeButton)

    NSLayoutConstraint.activate([
      closeButton.topAnchor.constraint(equalTo: effectView.topAnchor, constant: 8),
      closeButton.trailingAnchor.constraint(equalTo: effectView.trailingAnchor, constant: -8),
      closeButton.widthAnchor.constraint(equalToConstant: 24),
      closeButton.heightAnchor.constraint(equalToConstant: 24),
    ])

    // Show close button on hover
    clickableView.onHover = { isHovering in
      NSAnimationContext.runAnimationGroup { context in
        context.duration = 0.15
        closeButton.animator().alphaValue = isHovering ? 0.8 : 0
      }
    }

    clickableView.addSubview(container)
    panel.contentView = clickableView

    // Store panel reference
    sharedPanel = panel

    // Show panel
    panel.makeKeyAndOrderFront(nil)

    // Animate slide-in
    NSAnimationContext.runAnimationGroup({ context in
      context.duration = 0.3
      context.timingFunction = CAMediaTimingFunction(name: .easeOut)
      panel.animator().setFrame(
        NSRect(x: finalXPos, y: finalYPos, width: notificationWidth, height: notificationHeight),
        display: true
      )
      panel.animator().alphaValue = 1.0
    }) {
      // Auto-dismiss after timeout
      DispatchQueue.main.asyncAfter(deadline: .now() + timeoutSeconds) {
        dismissNotification()
      }
    }
  }

  Thread.sleep(forTimeInterval: 0.1)
  return true
}
