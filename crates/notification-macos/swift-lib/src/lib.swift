import AVFoundation
import Cocoa
import SwiftRs

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
      if inside && notification?.url != nil {
        NSCursor.pointingHand.set()
      } else {
        NSCursor.arrow.set()
      }
      onHover?(inside)
    }
  }

  override func mouseEntered(with event: NSEvent) {
    super.mouseEntered(with: event)
    isHovering = true
    if notification?.url != nil { NSCursor.pointingHand.set() }
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
      if isInside && notification?.url != nil {
        NSCursor.pointingHand.set()
      } else {
        NSCursor.arrow.set()
      }
      onHover?(isInside)
    }
  }

  override func mouseDown(with event: NSEvent) {
    alphaValue = 0.95
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { self.alphaValue = 1.0 }
    if let urlString = notification?.url, let url = URL(string: urlString) {
      NSWorkspace.shared.open(url)
    }
    notification?.dismiss()
  }

  override func viewDidMoveToWindow() {
    super.viewDidMoveToWindow()
    if window != nil { updateTrackingAreas() }
  }
}

class CloseButton: NSButton {
  weak var notification: NotificationInstance?
  var trackingArea: NSTrackingArea?

  static let buttonSize: CGFloat = 12
  static let symbolPointSize: CGFloat = 8

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
      let cfg = NSImage.SymbolConfiguration(pointSize: Self.symbolPointSize, weight: .semibold)
      image = NSImage(systemSymbolName: "xmark", accessibilityDescription: "Close")?
        .withSymbolConfiguration(cfg)
    } else {
      image = NSImage(named: NSImage.stopProgressTemplateName)
    }
    contentTintColor = NSColor.white.withAlphaComponent(0.95)

    layer?.cornerRadius = Self.buttonSize / 2
    layer?.backgroundColor = NSColor.white.withAlphaComponent(0.16).cgColor
    layer?.borderColor = NSColor.white.withAlphaComponent(0.18).cgColor
    layer?.borderWidth = 0.5

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
    layer?.backgroundColor = NSColor.white.withAlphaComponent(0.26).cgColor
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
      self.layer?.backgroundColor = NSColor.white.withAlphaComponent(0.16).cgColor
    }
    notification?.dismiss()
  }

  override func mouseEntered(with event: NSEvent) {
    super.mouseEntered(with: event)
    layer?.backgroundColor = NSColor.white.withAlphaComponent(0.20).cgColor
  }

  override func mouseExited(with event: NSEvent) {
    super.mouseExited(with: event)
    layer?.backgroundColor = NSColor.white.withAlphaComponent(0.16).cgColor
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
    controlSize = .regular
    font = NSFont.systemFont(ofSize: 14, weight: .semibold)
    focusRingType = .none

    contentTintColor = NSColor(calibratedWhite: 0.1, alpha: 1.0)
    if #available(macOS 11.0, *) {
      bezelColor = NSColor(calibratedWhite: 0.9, alpha: 1.0)
    }

    layer?.cornerRadius = 10
    layer?.backgroundColor = NSColor(calibratedWhite: 0.95, alpha: 0.9).cgColor
    layer?.borderColor = NSColor(calibratedWhite: 0.7, alpha: 0.5).cgColor
    layer?.borderWidth = 0.5

    layer?.shadowColor = NSColor(calibratedWhite: 0.0, alpha: 0.5).cgColor
    layer?.shadowOpacity = 0.3
    layer?.shadowRadius = 3
    layer?.shadowOffset = CGSize(width: 0, height: 1)
  }

  override var intrinsicContentSize: NSSize {
    var s = super.intrinsicContentSize
    s.width += 22
    s.height = max(28, s.height + 4)
    return s
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

  private var globalMouseMonitor: Any?
  private var hoverStates: [UUID: Bool] = [:]

  // MARK: - Configuration Constants
  private struct Config {
    static let notificationWidth: CGFloat = 360
    static let notificationHeight: CGFloat = 82
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

  private func setupApplicationIfNeeded() {
    let app = NSApplication.shared
    if app.delegate == nil {
      app.setActivationPolicy(.accessory)
    }
  }

  private func manageNotificationLimit() {
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

    setupContent(
      effectView: effectView, title: title, message: message, url: url, notification: notification)

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
    let occupiedHeight =
      activeNotifications.count * Int(Config.notificationHeight + notificationSpacing)
    return baseY - CGFloat(occupiedHeight)
  }

  private func repositionNotifications() {
    guard let screen = NSScreen.main else { return }
    let sorted = activeNotifications.values.sorted { $0.panel.frame.minY > $1.panel.frame.minY }
    for (index, notification) in sorted.enumerated() {
      let newY =
        calculateYPosition(screen: screen) + CGFloat(index)
        * (Config.notificationHeight + notificationSpacing)
      let f = notification.panel.frame
      let newFrame = NSRect(x: f.minX, y: newY, width: f.width, height: f.height)
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
        x: startXPos, y: yPosition, width: Config.notificationWidth,
        height: Config.notificationHeight),
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

    panel.ignoresMouseEvents = false
    panel.acceptsMouseMovedEvents = true
    return panel
  }

  private func createClickableView() -> ClickableView {
    let v = ClickableView(
      frame: NSRect(x: 0, y: 0, width: Config.notificationWidth, height: Config.notificationHeight))
    v.wantsLayer = true
    v.layer?.backgroundColor = NSColor.clear.cgColor
    return v
  }

  private func createContainer(clickableView: ClickableView) -> NSView {
    let container = NSView(frame: clickableView.bounds)
    container.wantsLayer = true
    container.layer?.cornerRadius = 11
    container.layer?.masksToBounds = false
    container.autoresizingMask = [.width, .height]
    container.layer?.shadowColor = NSColor.black.cgColor
    container.layer?.shadowOpacity = 0.22
    container.layer?.shadowOffset = CGSize(width: 0, height: 2)
    container.layer?.shadowRadius = 12
    return container
  }

  private func createEffectView(container: NSView) -> NSVisualEffectView {
    let effectView = NSVisualEffectView(frame: container.bounds)
    effectView.material = .popover
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
    borderLayer.borderColor = NSColor.white.withAlphaComponent(0.10).cgColor
    effectView.layer?.addSublayer(borderLayer)

    container.addSubview(effectView)
    return effectView
  }

  // MARK: - Content
  private func setupContent(
    effectView: NSVisualEffectView,
    title: String,
    message: String,
    url: String?,
    notification: NotificationInstance
  ) {
    let hasUrl = (url != nil && !url!.isEmpty)

    let contentView = createNotificationView(
      title: title,
      body: message,
      buttonTitle: hasUrl ? "Take Notes" : nil,
      notification: notification
    )
    contentView.translatesAutoresizingMaskIntoConstraints = false
    effectView.addSubview(contentView)

    // Adjust constraints to give more room for text if no button
    let trailingConstant: CGFloat = hasUrl ? -10 : -35  // More room when no button

    NSLayoutConstraint.activate([
      contentView.leadingAnchor.constraint(equalTo: effectView.leadingAnchor, constant: 12),
      contentView.trailingAnchor.constraint(
        equalTo: effectView.trailingAnchor, constant: trailingConstant),
      contentView.topAnchor.constraint(equalTo: effectView.topAnchor, constant: 9),
      contentView.bottomAnchor.constraint(equalTo: effectView.bottomAnchor, constant: -9),
    ])

    let closeButton = createCloseButton(effectView: effectView, notification: notification)
    setupCloseButtonHover(clickableView: notification.clickableView, closeButton: closeButton)
  }

  private func createNotificationView(
    title: String,
    body: String,
    buttonTitle: String? = nil,
    notification: NotificationInstance
  ) -> NSView {
    let container = NSStackView()
    container.orientation = .horizontal
    container.alignment = .centerY
    container.distribution = .fill
    container.spacing = 10

    // Icon container (unchanged)
    let iconContainer = NSView()
    iconContainer.wantsLayer = true
    iconContainer.layer?.cornerRadius = 9
    iconContainer.translatesAutoresizingMaskIntoConstraints = false
    iconContainer.widthAnchor.constraint(equalToConstant: 42).isActive = true
    iconContainer.heightAnchor.constraint(equalToConstant: 42).isActive = true

    let iconImageView = createAppIconView()
    iconContainer.addSubview(iconImageView)
    NSLayoutConstraint.activate([
      iconImageView.centerXAnchor.constraint(equalTo: iconContainer.centerXAnchor),
      iconImageView.centerYAnchor.constraint(equalTo: iconContainer.centerYAnchor),
      iconImageView.widthAnchor.constraint(equalToConstant: 32),
      iconImageView.heightAnchor.constraint(equalToConstant: 32),
    ])

    // Middle: text stack
    let textStack = NSStackView()
    textStack.orientation = .vertical
    textStack.spacing = 4
    textStack.alignment = .leading
    textStack.distribution = .fill

    textStack.setContentHuggingPriority(.defaultLow, for: .horizontal)
    textStack.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

    // Title
    let titleLabel = NSTextField(labelWithString: title)
    titleLabel.font = NSFont.systemFont(ofSize: 16, weight: .semibold)
    titleLabel.textColor = NSColor.labelColor
    titleLabel.lineBreakMode = .byTruncatingTail  // Shows "..." at end
    titleLabel.maximumNumberOfLines = 1
    titleLabel.allowsDefaultTighteningForTruncation = true
    titleLabel.usesSingleLineMode = true  // Ensure single line mode
    titleLabel.cell?.truncatesLastVisibleLine = true  // Force truncation

    // Set content priorities for title
    titleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

    // Body with proper ellipsis handling
    let bodyLabel = NSTextField(labelWithString: body)
    bodyLabel.font = NSFont.systemFont(ofSize: 12, weight: .light)
    bodyLabel.textColor = NSColor.secondaryLabelColor
    bodyLabel.lineBreakMode = .byTruncatingTail  // ADD THIS: Shows "..." at end
    bodyLabel.maximumNumberOfLines = 1
    bodyLabel.usesSingleLineMode = true  // ADD THIS: Ensure single line mode
    bodyLabel.cell?.truncatesLastVisibleLine = true  // ADD THIS: Force truncation

    bodyLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

    textStack.addArrangedSubview(titleLabel)
    textStack.addArrangedSubview(bodyLabel)

    // Assemble components
    container.addArrangedSubview(iconContainer)
    container.addArrangedSubview(textStack)

    // Right: action button (if provided)
    if let buttonTitle {
      // Add a small fixed spacer
      let gap = NSView()
      gap.translatesAutoresizingMaskIntoConstraints = false
      gap.widthAnchor.constraint(equalToConstant: 8).isActive = true
      gap.setContentHuggingPriority(.required, for: .horizontal)
      gap.setContentCompressionResistancePriority(.required, for: .horizontal)
      container.addArrangedSubview(gap)

      let btn = ActionButton(
        title: buttonTitle,
        target: self,
        action: #selector(handleActionButtonPress(_:))
      )
      // Button should maintain its size
      btn.setContentHuggingPriority(.required, for: .horizontal)
      btn.setContentCompressionResistancePriority(.required, for: .horizontal)
      btn.notification = notification
      container.addArrangedSubview(btn)
    }

    return container
  }

  @objc private func handleActionButtonPress(_ sender: NSButton) {
    guard let btn = sender as? ActionButton, let notification = btn.notification else { return }
    if let urlString = notification.url, let url = URL(string: urlString) {
      NSWorkspace.shared.open(url)
    }
    notification.dismiss()
  }

  private func createAppIconView() -> NSImageView {
    let imageView = NSImageView()
    if let appIcon = NSApp.applicationIconImage {
      imageView.image = appIcon
    } else {
      imageView.image = NSImage(named: NSImage.applicationIconName)
    }
    imageView.imageScaling = .scaleProportionallyUpOrDown
    imageView.translatesAutoresizingMaskIntoConstraints = false
    imageView.wantsLayer = true
    imageView.layer?.shadowColor = NSColor.black.cgColor
    imageView.layer?.shadowOpacity = 0.3
    imageView.layer?.shadowOffset = CGSize(width: 0, height: 1)
    imageView.layer?.shadowRadius = 2
    return imageView
  }

  private func createCloseButton(effectView: NSVisualEffectView, notification: NotificationInstance)
    -> CloseButton
  {
    let closeButton = CloseButton()
    closeButton.notification = notification
    closeButton.translatesAutoresizingMaskIntoConstraints = false
    effectView.addSubview(closeButton)

    NSLayoutConstraint.activate([
      closeButton.topAnchor.constraint(equalTo: effectView.topAnchor, constant: 6),
      closeButton.trailingAnchor.constraint(equalTo: effectView.trailingAnchor, constant: -6),
      closeButton.widthAnchor.constraint(equalToConstant: CloseButton.buttonSize),
      closeButton.heightAnchor.constraint(equalToConstant: CloseButton.buttonSize),
    ])
    return closeButton
  }

  private func setupCloseButtonHover(clickableView: ClickableView, closeButton: CloseButton) {
    closeButton.alphaValue = 0
    closeButton.isHidden = true

    clickableView.onHover = { isHovering in
      if isHovering { closeButton.isHidden = false }
      NSAnimationContext.runAnimationGroup(
        { context in
          context.duration = 0.15
          context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
          closeButton.animator().alphaValue = isHovering ? 1.0 : 0
        },
        completionHandler: {
          if !isHovering { closeButton.isHidden = true }
        }
      )
    }
  }

  private func showWithAnimation(
    notification: NotificationInstance, screen: NSScreen, timeoutSeconds: Double
  ) {
    let screenRect = screen.visibleFrame
    let finalXPos = screenRect.maxX - Config.notificationWidth - Config.rightMargin
    let currentFrame = notification.panel.frame

    notification.panel.orderFront(nil)

    NSAnimationContext.runAnimationGroup({ context in
      context.duration = 0.3
      context.timingFunction = CAMediaTimingFunction(name: .easeOut)
      notification.panel.animator().setFrame(
        NSRect(
          x: finalXPos, y: currentFrame.minY, width: Config.notificationWidth,
          height: Config.notificationHeight),
        display: true
      )
      notification.panel.animator().alphaValue = 1.0
    }) {
      DispatchQueue.main.async {
        notification.clickableView.updateTrackingAreas()
        notification.clickableView.window?.invalidateCursorRects(for: notification.clickableView)
        notification.clickableView.window?.resetCursorRects()
        self.updateHoverForAll(atScreenPoint: NSEvent.mouseLocation)
      }
      notification.startDismissTimer(timeoutSeconds: timeoutSeconds)
    }
  }

  // MARK: - Global mouse monitoring
  private func ensureGlobalMouseMonitor() {
    guard globalMouseMonitor == nil else { return }
    globalMouseMonitor = NSEvent.addGlobalMonitorForEvents(matching: [
      .mouseMoved, .leftMouseDragged, .rightMouseDragged,
    ]) { [weak self] _ in
      guard let self else { return }
      let pt = NSEvent.mouseLocation
      DispatchQueue.main.async { self.updateHoverForAll(atScreenPoint: pt) }
    }
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
    if activeNotifications.isEmpty, let monitor = globalMouseMonitor {
      NSEvent.removeMonitor(monitor)
      globalMouseMonitor = nil
    }
  }

  private func updateHoverForAll(atScreenPoint pt: NSPoint) {
    for (id, notif) in activeNotifications {
      let inside = notif.panel.frame.contains(pt)
      let prev = hoverStates[id] ?? false
      if inside != prev {
        hoverStates[id] = inside
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
  timeoutSeconds: Double
) -> Bool {
  let titleStr = title.toString()
  let messageStr = message.toString()
  let urlStr = url.toString()
  let finalUrl = urlStr.isEmpty ? nil : urlStr

  NotificationManager.shared.show(
    title: titleStr,
    message: messageStr,
    url: finalUrl,
    timeoutSeconds: timeoutSeconds
  )

  Thread.sleep(forTimeInterval: 0.1)
  return true
}
