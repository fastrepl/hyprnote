import AVFoundation
import Cocoa
import SwiftRs

// MARK: - Global State Management
private var sharedPanel: NSPanel?
private var sharedUrl: String?

// MARK: - Custom UI Components
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

    NotificationManager.shared.dismiss()
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
    NotificationManager.shared.dismiss()
  }
}

// MARK: - Notification Manager
class NotificationManager {
  static let shared = NotificationManager()
  private init() {}

  // MARK: - Configuration Constants
  private struct Config {
    static let notificationWidth: CGFloat = 360
    static let notificationHeight: CGFloat = 75
    static let rightMargin: CGFloat = 15
    static let topMargin: CGFloat = 15
    static let slideInOffset: CGFloat = 10
  }

  // MARK: - Public Methods
  func show(title: String, message: String, url: String?, timeoutSeconds: Double) {
    sharedUrl = url

    DispatchQueue.main.async { [weak self] in
      self?.setupApplicationIfNeeded()
      self?.createAndShowNotification(
        title: title,
        message: message,
        hasUrl: url != nil,
        timeoutSeconds: timeoutSeconds
      )
    }
  }

  func dismiss() {
    dismissNotification()
  }

  // MARK: - Private Methods
  private func setupApplicationIfNeeded() {
    let app = NSApplication.shared
    if app.delegate == nil {
      app.setActivationPolicy(.regular)
    }
  }

  private func createAndShowNotification(
    title: String, message: String, hasUrl: Bool, timeoutSeconds: Double
  ) {
    guard let screen = NSScreen.main else { return }

    let panel = createPanel(screen: screen)
    let clickableView = createClickableView()
    let container = createContainer(clickableView: clickableView)
    let effectView = createEffectView(container: container)

    setupContentStack(effectView: effectView, title: title, message: message, hasUrl: hasUrl)

    clickableView.addSubview(container)
    panel.contentView = clickableView

    sharedPanel = panel
    showWithAnimation(panel: panel, screen: screen, timeoutSeconds: timeoutSeconds)
  }

  private func createPanel(screen: NSScreen) -> NSPanel {
    let screenRect = screen.visibleFrame
    let startXPos = screenRect.maxX + Config.slideInOffset
    let finalYPos = screenRect.maxY - Config.notificationHeight - Config.topMargin

    let panel = NSPanel(
      contentRect: NSRect(
        x: startXPos, y: finalYPos,
        width: Config.notificationWidth, height: Config.notificationHeight
      ),
      styleMask: [.borderless, .nonactivatingPanel],
      backing: .buffered,
      defer: false
    )

    panel.level = .statusBar
    panel.isFloatingPanel = true
    panel.hidesOnDeactivate = false
    panel.isOpaque = false
    panel.backgroundColor = .clear
    panel.hasShadow = true
    panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .transient, .ignoresCycle]
    panel.isMovableByWindowBackground = false
    panel.alphaValue = 0

    return panel
  }

  private func createClickableView() -> ClickableView {
    return ClickableView(
      frame: NSRect(x: 0, y: 0, width: Config.notificationWidth, height: Config.notificationHeight)
    )
  }

  private func createContainer(clickableView: ClickableView) -> NSView {
    let container = NSView(frame: clickableView.bounds)
    container.wantsLayer = true
    container.layer?.cornerRadius = 11
    container.layer?.masksToBounds = false

    // Shadow for depth
    container.layer?.shadowColor = NSColor.black.cgColor
    container.layer?.shadowOpacity = 0.2
    container.layer?.shadowOffset = CGSize(width: 0, height: 2)
    container.layer?.shadowRadius = 10

    return container
  }

  private func createEffectView(container: NSView) -> NSVisualEffectView {
    let effectView = NSVisualEffectView(frame: container.bounds)
    effectView.material = .hudWindow
    effectView.state = .active
    effectView.blendingMode = .behindWindow
    effectView.wantsLayer = true
    effectView.layer?.cornerRadius = 11
    effectView.layer?.masksToBounds = true

    // Add subtle border for definition
    let borderLayer = CALayer()
    borderLayer.frame = effectView.bounds
    borderLayer.cornerRadius = 11
    borderLayer.borderWidth = 0.5
    borderLayer.borderColor = NSColor(white: 1.0, alpha: 0.05).cgColor
    effectView.layer?.addSublayer(borderLayer)

    container.addSubview(effectView)
    return effectView
  }

  private func setupContentStack(
    effectView: NSVisualEffectView, title: String, message: String, hasUrl: Bool
  ) {
    let contentStack = createContentStack(effectView: effectView)

    let iconContainer = createIconContainer(hasUrl: hasUrl)
    let textStack = createTextStack(title: title, message: message)
    let closeButton = createCloseButton(effectView: effectView)

    contentStack.addArrangedSubview(iconContainer)
    contentStack.addArrangedSubview(textStack)

    setupCloseButtonHover(effectView: effectView, closeButton: closeButton)
  }

  private func createContentStack(effectView: NSVisualEffectView) -> NSStackView {
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

    return contentStack
  }

  private func createIconContainer(hasUrl: Bool) -> NSView {
    let iconContainer = NSView()
    iconContainer.wantsLayer = true
    iconContainer.layer?.cornerRadius = 10
    iconContainer.widthAnchor.constraint(equalToConstant: 42).isActive = true
    iconContainer.heightAnchor.constraint(equalToConstant: 42).isActive = true

    // Simple gradient background
    let gradientLayer = CAGradientLayer()
    gradientLayer.frame = CGRect(x: 0, y: 0, width: 42, height: 42)
    gradientLayer.cornerRadius = 10
    gradientLayer.colors =
      hasUrl
      ? [NSColor.systemBlue.cgColor, NSColor(red: 0.2, green: 0.4, blue: 0.8, alpha: 1).cgColor]
      : [NSColor.systemGreen.cgColor, NSColor(red: 0.2, green: 0.6, blue: 0.4, alpha: 1).cgColor]
    gradientLayer.startPoint = CGPoint(x: 0, y: 0)
    gradientLayer.endPoint = CGPoint(x: 1, y: 1)
    iconContainer.layer?.addSublayer(gradientLayer)

    // App icon from bundle
    let iconImageView = createAppIconView()
    iconContainer.addSubview(iconImageView)

    NSLayoutConstraint.activate([
      iconImageView.centerXAnchor.constraint(equalTo: iconContainer.centerXAnchor),
      iconImageView.centerYAnchor.constraint(equalTo: iconContainer.centerYAnchor),
      iconImageView.widthAnchor.constraint(equalToConstant: 28),
      iconImageView.heightAnchor.constraint(equalToConstant: 28),
    ])

    return iconContainer
  }

  private func createAppIconView() -> NSImageView {
    let iconImageView = NSImageView()

    // Get the app's main icon from the bundle
    if let appIcon = NSApp.applicationIconImage {
      iconImageView.image = appIcon
    } else {
      iconImageView.image = NSImage(named: NSImage.applicationIconName)
    }

    iconImageView.imageScaling = .scaleProportionallyUpOrDown
    iconImageView.translatesAutoresizingMaskIntoConstraints = false

    // Add subtle shadow to the icon for better contrast
    iconImageView.wantsLayer = true
    iconImageView.layer?.shadowColor = NSColor.black.cgColor
    iconImageView.layer?.shadowOpacity = 0.3
    iconImageView.layer?.shadowOffset = CGSize(width: 0, height: 1)
    iconImageView.layer?.shadowRadius = 2

    return iconImageView
  }

  private func createTextStack(title: String, message: String) -> NSStackView {
    let textStack = NSStackView()
    textStack.orientation = .vertical
    textStack.alignment = .leading
    textStack.spacing = 2

    // Title
    let titleLabel = NSTextField(labelWithString: title)
    titleLabel.font = NSFont.systemFont(ofSize: 13, weight: .semibold)
    titleLabel.textColor = NSColor.labelColor
    titleLabel.backgroundColor = .clear
    titleLabel.isBezeled = false
    titleLabel.isEditable = false
    titleLabel.lineBreakMode = .byTruncatingTail
    titleLabel.maximumNumberOfLines = 1
    textStack.addArrangedSubview(titleLabel)

    // Message
    let messageLabel = NSTextField(labelWithString: message)
    messageLabel.font = NSFont.systemFont(ofSize: 12, weight: .regular)
    messageLabel.textColor = NSColor.secondaryLabelColor
    messageLabel.backgroundColor = .clear
    messageLabel.isBezeled = false
    messageLabel.isEditable = false
    messageLabel.lineBreakMode = .byTruncatingTail
    messageLabel.maximumNumberOfLines = 2
    textStack.addArrangedSubview(messageLabel)

    return textStack
  }

  private func createCloseButton(effectView: NSVisualEffectView) -> CloseButton {
    let closeButton = CloseButton(frame: NSRect(x: 0, y: 0, width: 24, height: 24))
    closeButton.translatesAutoresizingMaskIntoConstraints = false
    effectView.addSubview(closeButton)

    NSLayoutConstraint.activate([
      closeButton.topAnchor.constraint(equalTo: effectView.topAnchor, constant: 8),
      closeButton.trailingAnchor.constraint(equalTo: effectView.trailingAnchor, constant: -8),
      closeButton.widthAnchor.constraint(equalToConstant: 24),
      closeButton.heightAnchor.constraint(equalToConstant: 24),
    ])

    return closeButton
  }

  private func setupCloseButtonHover(effectView: NSVisualEffectView, closeButton: CloseButton) {
    guard let clickableView = effectView.superview?.superview as? ClickableView else { return }

    clickableView.onHover = { isHovering in
      NSAnimationContext.runAnimationGroup { context in
        context.duration = 0.15
        closeButton.animator().alphaValue = isHovering ? 0.8 : 0
      }
    }
  }

  private func showWithAnimation(panel: NSPanel, screen: NSScreen, timeoutSeconds: Double) {
    let screenRect = screen.visibleFrame
    let finalXPos = screenRect.maxX - Config.notificationWidth - Config.rightMargin
    let finalYPos = screenRect.maxY - Config.notificationHeight - Config.topMargin

    panel.makeKeyAndOrderFront(nil)

    // Animate slide-in
    NSAnimationContext.runAnimationGroup({ context in
      context.duration = 0.3
      context.timingFunction = CAMediaTimingFunction(name: .easeOut)
      panel.animator().setFrame(
        NSRect(
          x: finalXPos, y: finalYPos, width: Config.notificationWidth,
          height: Config.notificationHeight),
        display: true
      )
      panel.animator().alphaValue = 1.0
    }) {
      // Auto-dismiss after timeout
      DispatchQueue.main.asyncAfter(deadline: .now() + timeoutSeconds) {
        NotificationManager.shared.dismiss()
      }
    }
  }
}

// MARK: - Global Dismiss Function (for backward compatibility)
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

// MARK: - C API Binding (Minimal)
@_cdecl("_show_notification")
public func _showNotification(
  title: SRString,
  message: SRString,
  url: SRString,
  hasUrl: Bool,
  timeoutSeconds: Double
) -> Bool {
  let titleStr = title.toString()
  let messageStr = message.toString()
  let urlStr = hasUrl ? url.toString() : nil

  NotificationManager.shared.show(
    title: titleStr,
    message: messageStr,
    url: urlStr,
    timeoutSeconds: timeoutSeconds
  )

  Thread.sleep(forTimeInterval: 0.1)
  return true
}
