import Cocoa

extension NotificationManager {
  func setupDisplayChangeObserver() {
    displayChangeObserver = NotificationCenter.default.addObserver(
      forName: NSApplication.didChangeScreenParametersNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.handleDisplayChange()
    }
  }

  func handleDisplayChange() {
    repositionAllNotifications()
  }

  func repositionAllNotifications() {
    guard let screen = getTargetScreen() else { return }
    let screenRect = screen.visibleFrame
    let topPosition = screenRect.maxY - Config.notificationHeight - Config.topMargin
    let rightPosition = screenRect.maxX - Config.notificationWidth - Config.rightMargin

    let sorted = activeNotifications.values.sorted { $0.panel.frame.minY > $1.panel.frame.minY }

    for (index, notification) in sorted.enumerated() {
      let newY = topPosition - CGFloat(index) * (Config.notificationHeight + notificationSpacing)
      let newFrame = NSRect(
        x: rightPosition,
        y: newY,
        width: Config.notificationWidth,
        height: Config.notificationHeight
      )

      notification.panel.setFrame(newFrame, display: true)
      notification.clickableView.updateTrackingAreas()
      notification.clickableView.window?.invalidateCursorRects(for: notification.clickableView)
      notification.clickableView.window?.resetCursorRects()
    }

    updateHoverForAll(atScreenPoint: NSEvent.mouseLocation)
  }

  func getTargetScreen() -> NSScreen? {
    if let menuBarScreen = NSScreen.screens.first(where: { $0.frame.origin == .zero }) {
      return menuBarScreen
    }
    return NSScreen.main ?? NSScreen.screens.first
  }

  func repositionNotifications() {
    guard let screen = getTargetScreen() else { return }
    let screenRect = screen.visibleFrame
    let topPosition = screenRect.maxY - Config.notificationHeight - Config.topMargin
    let rightPosition = screenRect.maxX - Config.notificationWidth - Config.rightMargin

    let sorted = activeNotifications.values.sorted { $0.panel.frame.minY > $1.panel.frame.minY }
    for (index, notification) in sorted.enumerated() {
      let newY = topPosition - CGFloat(index) * (Config.notificationHeight + notificationSpacing)
      let newFrame = NSRect(
        x: rightPosition,
        y: newY,
        width: Config.notificationWidth,
        height: Config.notificationHeight
      )
      NSAnimationContext.runAnimationGroup { context in
        context.duration = 0.2
        context.timingFunction = CAMediaTimingFunction(name: .easeOut)
        notification.panel.animator().setFrame(newFrame, display: true)
      }
    }
  }

  func calculateYPosition(screen: NSScreen? = nil) -> CGFloat {
    let targetScreen = screen ?? getTargetScreen() ?? NSScreen.main!
    let screenRect = targetScreen.visibleFrame
    let baseY = screenRect.maxY - Config.notificationHeight - Config.topMargin
    let occupiedHeight =
      activeNotifications.count * Int(Config.notificationHeight + notificationSpacing)
    return baseY - CGFloat(occupiedHeight)
  }

  func createAndShowNotification(
    key: String, title: String, message: String, timeoutSeconds: Double
  ) {
    guard let screen = getTargetScreen() else { return }

    manageNotificationLimit()

    let yPosition = calculateYPosition(screen: screen)
    let panel = createPanel(screen: screen, yPosition: yPosition)
    let clickableView = createClickableView()
    let container = createContainer(clickableView: clickableView)
    let effectView = createEffectView(container: container)

    let notification = NotificationInstance(key: key, panel: panel, clickableView: clickableView)
    clickableView.notification = notification

    setupContent(
      effectView: effectView, title: title, message: message, notification: notification)

    clickableView.addSubview(container)
    panel.contentView = clickableView

    activeNotifications[notification.key] = notification
    hoverStates[notification.key] = false

    showWithAnimation(notification: notification, screen: screen, timeoutSeconds: timeoutSeconds)
    ensureGlobalMouseMonitor()
  }

  func createPanel(screen: NSScreen? = nil, yPosition: CGFloat) -> NSPanel {
    let targetScreen = screen ?? getTargetScreen() ?? NSScreen.main!
    let screenRect = targetScreen.visibleFrame
    let startXPos = screenRect.maxX + Config.slideInOffset

    let panel = NSPanel(
      contentRect: NSRect(
        x: startXPos, y: yPosition, width: Config.notificationWidth,
        height: Config.notificationHeight),
      styleMask: [.borderless, .nonactivatingPanel],
      backing: .buffered,
      defer: false,
      screen: targetScreen
    )

    panel.level = NSWindow.Level(rawValue: Int(Int32.max))
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

  func createClickableView() -> ClickableView {
    let v = ClickableView(
      frame: NSRect(x: 0, y: 0, width: Config.notificationWidth, height: Config.notificationHeight))
    v.wantsLayer = true
    v.layer?.backgroundColor = NSColor.clear.cgColor
    return v
  }

  func createContainer(clickableView: ClickableView) -> NSView {
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

  func createEffectView(container: NSView) -> NSVisualEffectView {
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

  func setupContent(
    effectView: NSVisualEffectView,
    title: String,
    message: String,
    notification: NotificationInstance
  ) {
    let contentView = createNotificationView(
      title: title,
      body: message,
      notification: notification
    )
    contentView.translatesAutoresizingMaskIntoConstraints = false
    effectView.addSubview(contentView)

    NSLayoutConstraint.activate([
      contentView.leadingAnchor.constraint(equalTo: effectView.leadingAnchor, constant: 12),
      contentView.trailingAnchor.constraint(equalTo: effectView.trailingAnchor, constant: -12),
      contentView.topAnchor.constraint(equalTo: effectView.topAnchor, constant: 9),
      contentView.bottomAnchor.constraint(equalTo: effectView.bottomAnchor, constant: -9),
    ])

    let closeButton = createCloseButton(effectView: effectView, notification: notification)
    setupCloseButtonHover(clickableView: notification.clickableView, closeButton: closeButton)
  }

  func createNotificationView(
    title: String,
    body: String,
    notification: NotificationInstance
  ) -> NSView {
    let container = NSStackView()
    container.orientation = .horizontal
    container.alignment = .centerY
    container.distribution = .fill
    container.spacing = 8

    let iconContainer = NSView()
    iconContainer.wantsLayer = true
    iconContainer.layer?.cornerRadius = 6
    iconContainer.translatesAutoresizingMaskIntoConstraints = false
    iconContainer.widthAnchor.constraint(equalToConstant: 32).isActive = true
    iconContainer.heightAnchor.constraint(equalToConstant: 32).isActive = true

    let iconImageView = createAppIconView()
    iconContainer.addSubview(iconImageView)
    NSLayoutConstraint.activate([
      iconImageView.centerXAnchor.constraint(equalTo: iconContainer.centerXAnchor),
      iconImageView.centerYAnchor.constraint(equalTo: iconContainer.centerYAnchor),
      iconImageView.widthAnchor.constraint(equalToConstant: 24),
      iconImageView.heightAnchor.constraint(equalToConstant: 24),
    ])

    let textStack = NSStackView()
    textStack.orientation = .vertical
    textStack.spacing = 2
    textStack.alignment = .leading
    textStack.distribution = .fill

    textStack.setContentHuggingPriority(.defaultLow, for: .horizontal)
    textStack.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

    let titleLabel = NSTextField(labelWithString: title)
    titleLabel.font = NSFont.systemFont(ofSize: 14, weight: .semibold)
    titleLabel.textColor = NSColor.labelColor
    titleLabel.lineBreakMode = .byTruncatingTail
    titleLabel.maximumNumberOfLines = 1
    titleLabel.allowsDefaultTighteningForTruncation = true
    titleLabel.usesSingleLineMode = true
    titleLabel.cell?.truncatesLastVisibleLine = true

    titleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

    let bodyLabel = NSTextField(labelWithString: body)
    bodyLabel.font = NSFont.systemFont(ofSize: 11, weight: .regular)
    bodyLabel.textColor = NSColor.secondaryLabelColor
    bodyLabel.lineBreakMode = .byTruncatingTail
    bodyLabel.maximumNumberOfLines = 1
    bodyLabel.usesSingleLineMode = true
    bodyLabel.cell?.truncatesLastVisibleLine = true

    bodyLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

    textStack.addArrangedSubview(titleLabel)
    textStack.addArrangedSubview(bodyLabel)

    let actionButton = ActionButton()
    actionButton.title = "Take notes"
    actionButton.notification = notification
    actionButton.setContentHuggingPriority(.required, for: .horizontal)

    container.addArrangedSubview(iconContainer)
    container.addArrangedSubview(textStack)
    container.addArrangedSubview(actionButton)

    return container
  }

  func createAppIconView() -> NSImageView {
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

  func createCloseButton(effectView: NSVisualEffectView, notification: NotificationInstance)
    -> CloseButton
  {
    let closeButton = CloseButton()
    closeButton.notification = notification
    closeButton.translatesAutoresizingMaskIntoConstraints = false
    effectView.addSubview(closeButton)

    NSLayoutConstraint.activate([
      closeButton.topAnchor.constraint(equalTo: effectView.topAnchor, constant: 5),
      closeButton.leadingAnchor.constraint(equalTo: effectView.leadingAnchor, constant: 4),
      closeButton.widthAnchor.constraint(equalToConstant: CloseButton.buttonSize),
      closeButton.heightAnchor.constraint(equalToConstant: CloseButton.buttonSize),
    ])
    return closeButton
  }

  func setupCloseButtonHover(clickableView: ClickableView, closeButton: CloseButton) {
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

  func showWithAnimation(
    notification: NotificationInstance, screen: NSScreen, timeoutSeconds: Double
  ) {
    let screenRect = screen.visibleFrame
    let finalXPos = screenRect.maxX - Config.notificationWidth - Config.rightMargin
    let currentFrame = notification.panel.frame

    notification.panel.setFrame(
      NSRect(
        x: screenRect.maxX + Config.slideInOffset,
        y: currentFrame.minY,
        width: Config.notificationWidth,
        height: Config.notificationHeight
      ),
      display: false
    )

    notification.panel.orderFrontRegardless()
    notification.panel.makeKeyAndOrderFront(nil)

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

  func ensureGlobalMouseMonitor() {
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

  func stopGlobalMouseMonitorIfNeeded() {
    if activeNotifications.isEmpty, let monitor = globalMouseMonitor {
      NSEvent.removeMonitor(monitor)
      globalMouseMonitor = nil
    }
  }

  func updateHoverForAll(atScreenPoint pt: NSPoint) {
    for (key, notif) in activeNotifications {
      let inside = notif.panel.frame.contains(pt)
      let prev = hoverStates[key] ?? false
      if inside != prev {
        hoverStates[key] = inside
        notif.clickableView.onHover?(inside)
      }
    }
  }
}
