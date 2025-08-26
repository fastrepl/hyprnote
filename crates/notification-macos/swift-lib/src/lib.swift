import AVFoundation
import Cocoa
import SwiftRs

// MARK: - Notification Instance
class NotificationInstance {
  let id = UUID()
  let panel: NSPanel
  let clickableView: ClickableView
  let url: String?
  private var dismissTimer: DispatchWorkItem?

  init(panel: NSPanel, clickableView: ClickableView, url: String?) {
    self.panel = panel
    self.clickableView = clickableView
    self.url = url
  }

  func startDismissTimer(timeoutSeconds: Double) {
    dismissTimer?.cancel()
    let timer = DispatchWorkItem { [weak self] in
      self?.dismiss()
    }
    dismissTimer = timer
    DispatchQueue.main.asyncAfter(deadline: .now() + timeoutSeconds, execute: timer)
  }

  func dismiss() {
    dismissTimer?.cancel()
    dismissTimer = nil

    NSAnimationContext.runAnimationGroup({ context in
      context.duration = 0.2
      context.timingFunction = CAMediaTimingFunction(name: .easeIn)
      self.panel.animator().alphaValue = 0
    }) {
      self.panel.close()
      NotificationManager.shared.removeNotification(self)
    }
  }

  deinit {
    dismissTimer?.cancel()
  }
}

// MARK: - Custom UI Components
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

    // Remove ALL existing tracking areas to ensure clean state
    for area in trackingAreas {
      removeTrackingArea(area)
    }
    trackingArea = nil

    // Create new tracking area that covers the entire view
    // Use .activeAlways for non-activating panels
    let options: NSTrackingArea.Options = [
      .activeAlways,
      .mouseEnteredAndExited,
      .mouseMoved,
      .inVisibleRect,
      .enabledDuringMouseDrag,
    ]

    let area = NSTrackingArea(
      rect: bounds,
      options: options,
      owner: self,
      userInfo: nil
    )

    addTrackingArea(area)
    trackingArea = area

    // Immediately reconcile hover state in case the cursor is already inside
    updateHoverStateFromCurrentMouseLocation()
  }

  private func updateHoverStateFromCurrentMouseLocation() {
    guard let win = window else { return }
    let global = win.mouseLocationOutsideOfEventStream
    let local = convert(global, from: nil)
    let inside = bounds.contains(local)

    if inside != isHovering {
      isHovering = inside
      if inside && notification?.url != nil {
        NSCursor.pointingHand.set()
      } else {
        NSCursor.arrow.set()
      }
      onHover?(inside)  // call synchronously
    }
  }

  override func mouseEntered(with event: NSEvent) {
    super.mouseEntered(with: event)
    isHovering = true
    if let url = notification?.url {
      NSCursor.pointingHand.set()
    }
    onHover?(true)  // call synchronously
  }

  override func mouseExited(with event: NSEvent) {
    super.mouseExited(with: event)
    isHovering = false
    NSCursor.arrow.set()
    onHover?(false)  // call synchronously
  }

  // Add mouseMoved to help with tracking
  override func mouseMoved(with event: NSEvent) {
    super.mouseMoved(with: event)
    let location = convert(event.locationInWindow, from: nil)
    let isInside = bounds.contains(location)

    if isInside != isHovering {
      isHovering = isInside
      if isInside && notification?.url != nil {
        NSCursor.pointingHand.set()
      } else {
        NSCursor.arrow.set()
      }
      onHover?(isInside)  // call synchronously
    }
  }

  override func mouseDown(with event: NSEvent) {
    // Visual feedback
    alphaValue = 0.95
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
      self.alphaValue = 1.0
    }

    // Open URL if provided
    if let urlString = notification?.url, let url = URL(string: urlString) {
      NSWorkspace.shared.open(url)
    }

    notification?.dismiss()
  }

  override func viewDidMoveToWindow() {
    super.viewDidMoveToWindow()
    if window != nil {
      updateTrackingAreas()
    }
  }
}

class CloseButton: NSButton {
  weak var notification: NotificationInstance?
  var trackingArea: NSTrackingArea?

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
    layer?.cornerRadius = 12
    layer?.backgroundColor = NSColor(white: 0.0, alpha: 0.4).cgColor
    isBordered = false

    let attributes: [NSAttributedString.Key: Any] = [
      .font: NSFont.systemFont(ofSize: 13, weight: .medium),
      .foregroundColor: NSColor.white,
    ]
    attributedTitle = NSAttributedString(string: "✕", attributes: attributes)

    // Initially hidden
    alphaValue = 0
    isHidden = true
  }

  override func updateTrackingAreas() {
    super.updateTrackingAreas()

    if let existingArea = trackingArea {
      removeTrackingArea(existingArea)
      trackingArea = nil
    }

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
    // Add visual feedback
    layer?.backgroundColor = NSColor(white: 0.0, alpha: 0.6).cgColor

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
      self.layer?.backgroundColor = NSColor(white: 0.0, alpha: 0.4).cgColor
    }

    notification?.dismiss()
  }

  override func mouseEntered(with event: NSEvent) {
    super.mouseEntered(with: event)
    layer?.backgroundColor = NSColor(white: 0.0, alpha: 0.5).cgColor
  }

  override func mouseExited(with event: NSEvent) {
    super.mouseExited(with: event)
    layer?.backgroundColor = NSColor(white: 0.0, alpha: 0.4).cgColor
  }
}

// MARK: - Notification Manager
class NotificationManager {
  static let shared = NotificationManager()
  private init() {}

  // MARK: - State Management
  private var activeNotifications: [UUID: NotificationInstance] = [:]
  private let maxNotifications = 5
  private let notificationSpacing: CGFloat = 10

  // Global mouse monitor to make hover work even when the app/panel is not key
  private var globalMouseMonitor: Any?
  private var hoverStates: [UUID: Bool] = [:]

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
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.setupApplicationIfNeeded()
      self.createAndShowNotification(
        title: title,
        message: message,
        url: url,
        timeoutSeconds: timeoutSeconds
      )
    }
  }

  func dismiss() {
    // Dismiss the most recent notification
    if let mostRecent = activeNotifications.values.max(by: {
      $0.panel.frame.minY < $1.panel.frame.minY
    }) {
      mostRecent.dismiss()
    }
  }

  func dismissAll() {
    activeNotifications.values.forEach { $0.dismiss() }
  }

  func removeNotification(_ notification: NotificationInstance) {
    activeNotifications.removeValue(forKey: notification.id)
    hoverStates.removeValue(forKey: notification.id)
    repositionNotifications()
    stopGlobalMouseMonitorIfNeeded()
  }

  // MARK: - Private Methods
  private func setupApplicationIfNeeded() {
    let app = NSApplication.shared
    if app.delegate == nil {
      app.setActivationPolicy(.accessory)  // Better background behavior
    }
  }

  private func manageNotificationLimit() {
    // Remove oldest notifications if we exceed the limit
    while activeNotifications.count >= maxNotifications {
      if let oldest = activeNotifications.values.min(by: {
        $0.panel.frame.minY > $1.panel.frame.minY
      }) {
        oldest.dismiss()
      }
    }
  }

  private func createAndShowNotification(
    title: String, message: String, url: String?, timeoutSeconds: Double
  ) {
    guard let screen = NSScreen.main else { return }

    manageNotificationLimit()

    let yPosition = calculateYPosition(screen: screen)
    let panel = createPanel(screen: screen, yPosition: yPosition)
    let clickableView = createClickableView()
    let container = createContainer(clickableView: clickableView)
    let effectView = createEffectView(container: container)

    let notification = NotificationInstance(panel: panel, clickableView: clickableView, url: url)
    clickableView.notification = notification

    setupContentStack(
      effectView: effectView,
      title: title,
      message: message,
      hasUrl: url != nil,
      notification: notification
    )

    clickableView.addSubview(container)
    panel.contentView = clickableView

    activeNotifications[notification.id] = notification
    hoverStates[notification.id] = false

    showWithAnimation(notification: notification, screen: screen, timeoutSeconds: timeoutSeconds)
    ensureGlobalMouseMonitor()
  }

  private func calculateYPosition(screen: NSScreen) -> CGFloat {
    let screenRect = screen.visibleFrame
    let baseY = screenRect.maxY - Config.notificationHeight - Config.topMargin

    // Stack notifications vertically
    let occupiedHeight =
      activeNotifications.count * Int(Config.notificationHeight + notificationSpacing)
    return baseY - CGFloat(occupiedHeight)
  }

  private func repositionNotifications() {
    guard let screen = NSScreen.main else { return }

    let sortedNotifications = activeNotifications.values.sorted {
      $0.panel.frame.minY > $1.panel.frame.minY
    }

    for (index, notification) in sortedNotifications.enumerated() {
      let newY =
        calculateYPosition(screen: screen) + CGFloat(index)
        * (Config.notificationHeight + notificationSpacing)
      let currentFrame = notification.panel.frame
      let newFrame = NSRect(
        x: currentFrame.minX,
        y: newY,
        width: currentFrame.width,
        height: currentFrame.height
      )

      NSAnimationContext.runAnimationGroup { context in
        context.duration = 0.2
        context.timingFunction = CAMediaTimingFunction(name: .easeOut)
        notification.panel.animator().setFrame(newFrame, display: true)
      }
    }
  }

  private func createPanel(screen: NSScreen, yPosition: CGFloat) -> NSPanel {
    let screenRect = screen.visibleFrame
    let startXPos = screenRect.maxX + Config.slideInOffset

    let panel = NSPanel(
      contentRect: NSRect(
        x: startXPos, y: yPosition,
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
    panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .ignoresCycle]
    panel.isMovableByWindowBackground = false
    panel.alphaValue = 0

    // Enable mouse events
    panel.ignoresMouseEvents = false
    panel.acceptsMouseMovedEvents = true

    return panel
  }

  private func createClickableView() -> ClickableView {
    let clickableView = ClickableView(
      frame: NSRect(x: 0, y: 0, width: Config.notificationWidth, height: Config.notificationHeight)
    )

    // Ensure tracking areas are set up
    clickableView.wantsLayer = true
    clickableView.layer?.backgroundColor = NSColor.clear.cgColor

    return clickableView
  }

  private func createContainer(clickableView: ClickableView) -> NSView {
    let container = NSView(frame: clickableView.bounds)
    container.wantsLayer = true
    container.layer?.cornerRadius = 11
    container.layer?.masksToBounds = false
    container.autoresizingMask = [.width, .height]

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
    effectView.autoresizingMask = [.width, .height]

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
    effectView: NSVisualEffectView,
    title: String,
    message: String,
    hasUrl: Bool,
    notification: NotificationInstance
  ) {
    let contentStack = createContentStack(effectView: effectView)

    let iconContainer = createIconContainer(hasUrl: hasUrl)
    let textStack = createTextStack(title: title, message: message)
    let closeButton = createCloseButton(effectView: effectView, notification: notification)

    contentStack.addArrangedSubview(iconContainer)
    contentStack.addArrangedSubview(textStack)

    // Setup hover functionality for close button - show/hide on notification hover
    setupCloseButtonHover(clickableView: notification.clickableView, closeButton: closeButton)
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

    if let appIcon = NSApp.applicationIconImage {
      iconImageView.image = appIcon
    } else {
      iconImageView.image = NSImage(named: NSImage.applicationIconName)
    }

    iconImageView.imageScaling = .scaleProportionallyUpOrDown
    iconImageView.translatesAutoresizingMaskIntoConstraints = false

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

    let titleLabel = NSTextField(labelWithString: title)
    titleLabel.font = NSFont.systemFont(ofSize: 13, weight: .semibold)
    titleLabel.textColor = NSColor.labelColor
    titleLabel.backgroundColor = .clear
    titleLabel.isBezeled = false
    titleLabel.isEditable = false
    titleLabel.lineBreakMode = .byTruncatingTail
    titleLabel.maximumNumberOfLines = 1
    textStack.addArrangedSubview(titleLabel)

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

  private func createCloseButton(effectView: NSVisualEffectView, notification: NotificationInstance)
    -> CloseButton
  {
    let closeButton = CloseButton(frame: NSRect(x: 0, y: 0, width: 24, height: 24))
    closeButton.notification = notification
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

  private func setupCloseButtonHover(clickableView: ClickableView, closeButton: CloseButton) {
    // Start hidden so it doesn't intercept events
    closeButton.alphaValue = 0
    closeButton.isHidden = true

    clickableView.onHover = { isHovering in
      if isHovering {
        closeButton.isHidden = false
      }

      NSAnimationContext.runAnimationGroup(
        { context in
          context.duration = 0.15
          context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
          closeButton.animator().alphaValue = isHovering ? 0.9 : 0
        },
        completionHandler: {
          if !isHovering {
            // After fade-out completes, hide to stop intercepting mouse events
            closeButton.isHidden = true
          }
        })
    }
  }

  private func showWithAnimation(
    notification: NotificationInstance, screen: NSScreen, timeoutSeconds: Double
  ) {
    let screenRect = screen.visibleFrame
    let finalXPos = screenRect.maxX - Config.notificationWidth - Config.rightMargin
    let currentFrame = notification.panel.frame

    notification.panel.orderFront(nil)

    // Animate slide-in
    NSAnimationContext.runAnimationGroup({ context in
      context.duration = 0.3
      context.timingFunction = CAMediaTimingFunction(name: .easeOut)
      notification.panel.animator().setFrame(
        NSRect(
          x: finalXPos, y: currentFrame.minY,
          width: Config.notificationWidth, height: Config.notificationHeight),
        display: true
      )
      notification.panel.animator().alphaValue = 1.0
    }) {
      // Ensure tracking areas are properly set up after animation
      DispatchQueue.main.async {
        notification.clickableView.updateTrackingAreas()
        notification.clickableView.window?.invalidateCursorRects(for: notification.clickableView)
        notification.clickableView.window?.resetCursorRects()
        // Force an immediate hover check using the global mouse
        self.updateHoverForAll(atScreenPoint: NSEvent.mouseLocation)
      }

      // Start auto-dismiss timer
      notification.startDismissTimer(timeoutSeconds: timeoutSeconds)
    }
  }

  // MARK: - Global mouse monitoring (robust hover even when app/panel is not key)
  private func ensureGlobalMouseMonitor() {
    guard globalMouseMonitor == nil else { return }
    globalMouseMonitor = NSEvent.addGlobalMonitorForEvents(matching: [
      .mouseMoved, .leftMouseDragged, .rightMouseDragged,
    ]) { [weak self] _ in
      guard let self else { return }
      let pt = NSEvent.mouseLocation  // screen coordinates
      DispatchQueue.main.async {
        self.updateHoverForAll(atScreenPoint: pt)
      }
    }
    // Also a local monitor to handle when app is active (faster updates)
    NSEvent.addLocalMonitorForEvents(matching: [.mouseMoved, .leftMouseDragged, .rightMouseDragged])
    { [weak self] event in
      if let self = self {
        let pt = NSEvent.mouseLocation
        self.updateHoverForAll(atScreenPoint: pt)
      }
      return event
    }
  }

  private func stopGlobalMouseMonitorIfNeeded() {
    if activeNotifications.isEmpty {
      if let monitor = globalMouseMonitor {
        NSEvent.removeMonitor(monitor)
        globalMouseMonitor = nil
      }
    }
  }

  private func updateHoverForAll(atScreenPoint pt: NSPoint) {
    for (id, notif) in activeNotifications {
      let inside = notif.panel.frame.contains(pt)
      let prev = hoverStates[id] ?? false
      if inside != prev {
        hoverStates[id] = inside
        // Drive the same onHover used by tracking areas
        notif.clickableView.onHover?(inside)
      }
    }
  }
}

// MARK: - C API Binding
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
