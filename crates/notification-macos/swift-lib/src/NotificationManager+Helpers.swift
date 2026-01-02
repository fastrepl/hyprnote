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
    let rightPosition = screenRect.maxX - panelWidth() - Config.rightMargin + Config.buttonOverhang

    let sorted = activeNotifications.values.sorted { $0.panel.frame.minY > $1.panel.frame.minY }

    var currentY = screenRect.maxY - Config.topMargin + Config.buttonOverhang

    for notification in sorted {
      let height = notification.panel.frame.height
      currentY -= height
      let newFrame = NSRect(
        x: rightPosition,
        y: currentY,
        width: panelWidth(),
        height: height
      )
      currentY -= notificationSpacing

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
    let rightPosition = screenRect.maxX - panelWidth() - Config.rightMargin + Config.buttonOverhang

    let sorted = activeNotifications.values.sorted { $0.panel.frame.minY > $1.panel.frame.minY }

    var currentY = screenRect.maxY - Config.topMargin + Config.buttonOverhang

    for notification in sorted {
      let height = notification.panel.frame.height
      currentY -= height
      let newFrame = NSRect(
        x: rightPosition,
        y: currentY,
        width: panelWidth(),
        height: height
      )
      currentY -= notificationSpacing

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

    var occupiedHeight: CGFloat = 0
    for notification in activeNotifications.values {
      occupiedHeight += notification.panel.frame.height + notificationSpacing
    }

    let baseY = screenRect.maxY - panelHeight() - Config.topMargin + Config.buttonOverhang
    return baseY - occupiedHeight
  }

  func createAndShowNotification(
    key: String, title: String, message: String, timeoutSeconds: Double, startTime: Date?
  ) {
    guard let screen = getTargetScreen() else { return }

    manageNotificationLimit()

    let yPosition = calculateYPosition(screen: screen)
    let panel = createPanel(screen: screen, yPosition: yPosition)
    let clickableView = createClickableView()
    let container = createContainer(clickableView: clickableView)
    let effectView = createEffectView(container: container)

    let notification = NotificationInstance(key: key, panel: panel, clickableView: clickableView)
    notification.meetingStartTime = startTime
    clickableView.notification = notification

    clickableView.addSubview(container)
    panel.contentView = clickableView

    setupContent(
      effectView: effectView, container: container, title: title, message: message, notification: notification)

    activeNotifications[notification.key] = notification
    hoverStates[notification.key] = false

    showWithAnimation(notification: notification, screen: screen, timeoutSeconds: timeoutSeconds)
    ensureGlobalMouseMonitor()
  }

  func panelWidth() -> CGFloat {
    Config.notificationWidth + Config.buttonOverhang
  }

  func panelHeight(expanded: Bool = false) -> CGFloat {
    let contentHeight = expanded ? Config.expandedNotificationHeight : Config.notificationHeight
    return contentHeight + Config.buttonOverhang
  }

  func createPanel(screen: NSScreen? = nil, yPosition: CGFloat) -> NSPanel {
    let targetScreen = screen ?? getTargetScreen() ?? NSScreen.main!
    let screenRect = targetScreen.visibleFrame
    let startXPos = screenRect.maxX + Config.slideInOffset

    let panel = NSPanel(
      contentRect: NSRect(
        x: startXPos, y: yPosition, width: panelWidth(),
        height: panelHeight()),
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
      frame: NSRect(x: 0, y: 0, width: panelWidth(), height: panelHeight()))
    v.wantsLayer = true
    v.layer?.backgroundColor = NSColor.clear.cgColor
    v.autoresizingMask = [.width, .height]
    return v
  }

  func createContainer(clickableView: ClickableView) -> NSView {
    let overhang = Config.buttonOverhang
    let container = NSView(
      frame: NSRect(
        x: overhang,
        y: 0,
        width: clickableView.bounds.width - overhang,
        height: clickableView.bounds.height - overhang
      )
    )
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
    container: NSView,
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

    notification.compactContentView = contentView

    let closeButton = createCloseButton(
      clickableView: notification.clickableView, container: container, notification: notification)
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

    let detailsButton = DetailsButton()
    detailsButton.title = "Details"
    detailsButton.notification = notification
    detailsButton.setContentHuggingPriority(.required, for: .horizontal)

    container.addArrangedSubview(iconContainer)
    container.addArrangedSubview(textStack)
    container.addArrangedSubview(detailsButton)

    return container
  }

  func createExpandedNotificationView(
    title: String,
    notification: NotificationInstance
  ) -> NSView {
    let container = NSStackView()
    container.orientation = .vertical
    container.alignment = .leading
    container.distribution = .fill
    container.spacing = 12

    let titleLabel = NSTextField(labelWithString: title)
    titleLabel.font = NSFont.systemFont(ofSize: 15, weight: .semibold)
    titleLabel.textColor = NSColor.labelColor
    titleLabel.lineBreakMode = .byTruncatingTail
    titleLabel.maximumNumberOfLines = 1
    container.addArrangedSubview(titleLabel)

    let participantsStack = createParticipantsSection()
    container.addArrangedSubview(participantsStack)

    let separator = NSBox()
    separator.boxType = .separator
    separator.translatesAutoresizingMaskIntoConstraints = false
    container.addArrangedSubview(separator)
    separator.widthAnchor.constraint(equalTo: container.widthAnchor).isActive = true

    let detailsStack = createDetailsSection()
    container.addArrangedSubview(detailsStack)

    let (actionStack, timerLabel) = createActionSection(notification: notification)
    container.addArrangedSubview(actionStack)
    actionStack.widthAnchor.constraint(equalTo: container.widthAnchor).isActive = true

    notification.startCountdown(label: timerLabel)

    return container
  }

  private func createParticipantsSection() -> NSStackView {
    let stack = NSStackView()
    stack.orientation = .vertical
    stack.alignment = .leading
    stack.spacing = 4

    let participants: [(name: String, email: String, status: ParticipantStatus)] = [
      ("", "sjobs@apple.com", .accepted),
      ("John Jeong", "john@hyprnote.com", .accepted),
      ("Yujong Lee", "yujonglee@hyprnote.com", .maybe),
      ("Tony Stark", "tony@hyprnote.com", .declined),
    ]

    for participant in participants {
      let row = createParticipantRow(
        name: participant.name,
        email: participant.email,
        status: participant.status
      )
      stack.addArrangedSubview(row)
    }

    return stack
  }

  private func createParticipantRow(name: String, email: String, status: ParticipantStatus)
    -> NSView
  {
    let row = NSStackView()
    row.orientation = .horizontal
    row.alignment = .centerY
    row.spacing = 6

    let displayText = name.isEmpty ? email : "\(name) (\(email))"
    let label = NSTextField(labelWithString: displayText)
    label.font = NSFont.systemFont(ofSize: 12, weight: .regular)
    label.textColor = NSColor.labelColor

    let statusIcon = NSTextField(labelWithString: status.icon)
    statusIcon.font = NSFont.systemFont(ofSize: 12)
    statusIcon.textColor = status.color

    row.addArrangedSubview(label)
    row.addArrangedSubview(statusIcon)

    return row
  }

  private func createDetailsSection() -> NSStackView {
    let stack = NSStackView()
    stack.orientation = .vertical
    stack.alignment = .leading
    stack.spacing = 8

    let details: [(label: String, value: String)] = [
      ("What:", "Discovery call - Apple <> Hyprnote"),
      ("Invitee Time Zone:", "America/Cupertino"),
      ("Who:", "John Jeong - Organizer\njohn@hyprnote.com\nSteve\nsjobs@apple.com"),
      ("Where:", "... See more"),
    ]

    for detail in details {
      let row = createDetailRow(label: detail.label, value: detail.value)
      stack.addArrangedSubview(row)
    }

    return stack
  }

  private func createDetailRow(label: String, value: String) -> NSView {
    let container = NSStackView()
    container.orientation = .vertical
    container.alignment = .leading
    container.spacing = 2

    let labelField = NSTextField(labelWithString: label)
    labelField.font = NSFont.systemFont(ofSize: 11, weight: .medium)
    labelField.textColor = NSColor.secondaryLabelColor

    let valueField = NSTextField(labelWithString: value)
    valueField.font = NSFont.systemFont(ofSize: 12, weight: .regular)
    valueField.textColor = NSColor.labelColor
    valueField.maximumNumberOfLines = 0
    valueField.lineBreakMode = .byWordWrapping

    container.addArrangedSubview(labelField)
    container.addArrangedSubview(valueField)

    return container
  }

  private func createActionSection(notification: NotificationInstance) -> (
    NSStackView, NSTextField
  ) {
    let stack = NSStackView()
    stack.orientation = .vertical
    stack.alignment = .centerX
    stack.spacing = 8

    let actionButton = ActionButton()
    actionButton.title = "  Join Zoom & Start listening"
    actionButton.notification = notification
    actionButton.font = NSFont.systemFont(ofSize: 13, weight: .medium)
    actionButton.layer?.cornerRadius = 10
    actionButton.layer?.backgroundColor = NSColor(calibratedWhite: 0.35, alpha: 0.95).cgColor
    actionButton.contentTintColor = NSColor.white
    actionButton.translatesAutoresizingMaskIntoConstraints = false
    actionButton.heightAnchor.constraint(equalToConstant: 36).isActive = true

    let timerLabel = NSTextField(labelWithString: "")
    timerLabel.font = NSFont.systemFont(ofSize: 11, weight: .regular)
    timerLabel.textColor = NSColor.secondaryLabelColor
    timerLabel.alignment = .center

    stack.addArrangedSubview(actionButton)
    stack.addArrangedSubview(timerLabel)

    actionButton.widthAnchor.constraint(equalTo: stack.widthAnchor, constant: -24).isActive = true

    return (stack, timerLabel)
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

  func createCloseButton(clickableView: ClickableView, container: NSView, notification: NotificationInstance)
    -> CloseButton
  {
    let closeButton = CloseButton()
    closeButton.notification = notification
    closeButton.translatesAutoresizingMaskIntoConstraints = false
    clickableView.addSubview(closeButton, positioned: .above, relativeTo: nil)

    let buttonOffset = (CloseButton.buttonSize / 2) - 2
    NSLayoutConstraint.activate([
      closeButton.centerYAnchor.constraint(equalTo: container.topAnchor, constant: buttonOffset),
      closeButton.centerXAnchor.constraint(equalTo: container.leadingAnchor, constant: buttonOffset),
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
    let finalXPos = screenRect.maxX - panelWidth() - Config.rightMargin + Config.buttonOverhang
    let currentFrame = notification.panel.frame

    notification.panel.setFrame(
      NSRect(
        x: screenRect.maxX + Config.slideInOffset,
        y: currentFrame.minY,
        width: panelWidth(),
        height: panelHeight()
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
          x: finalXPos, y: currentFrame.minY, width: panelWidth(),
          height: panelHeight()),
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

  func animateExpansion(notification: NotificationInstance, isExpanded: Bool) {
    let targetHeight = panelHeight(expanded: isExpanded)
    let currentFrame = notification.panel.frame

    let heightDiff = targetHeight - currentFrame.height
    let newFrame = NSRect(
      x: currentFrame.minX,
      y: currentFrame.minY - heightDiff,
      width: currentFrame.width,
      height: targetHeight
    )

    guard let effectView = notification.clickableView.subviews.first?.subviews.first
      as? NSVisualEffectView
    else { return }

    if isExpanded {
      notification.compactContentView?.alphaValue = 1.0

      let expandedView = createExpandedNotificationView(
        title: "Discovery call - Apple <> Hyprnote",
        notification: notification
      )
      expandedView.translatesAutoresizingMaskIntoConstraints = false
      expandedView.alphaValue = 0
      effectView.addSubview(expandedView)

      NSLayoutConstraint.activate([
        expandedView.leadingAnchor.constraint(equalTo: effectView.leadingAnchor, constant: 16),
        expandedView.trailingAnchor.constraint(equalTo: effectView.trailingAnchor, constant: -16),
        expandedView.topAnchor.constraint(equalTo: effectView.topAnchor, constant: 14),
        expandedView.bottomAnchor.constraint(equalTo: effectView.bottomAnchor, constant: -14),
      ])

      notification.expandedContentView = expandedView

      NSAnimationContext.runAnimationGroup({ context in
        context.duration = 0.25
        context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        notification.panel.animator().setFrame(newFrame, display: true)
        notification.compactContentView?.animator().alphaValue = 0
        expandedView.animator().alphaValue = 1.0
      }) {
        notification.compactContentView?.isHidden = true
        notification.clickableView.updateTrackingAreas()
        self.repositionNotifications()
      }
    } else {
      notification.stopCountdown()
      notification.expandedContentView?.alphaValue = 1.0
      notification.compactContentView?.isHidden = false

      NSAnimationContext.runAnimationGroup({ context in
        context.duration = 0.25
        context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        notification.panel.animator().setFrame(newFrame, display: true)
        notification.expandedContentView?.animator().alphaValue = 0
        notification.compactContentView?.animator().alphaValue = 1.0
      }) {
        notification.expandedContentView?.removeFromSuperview()
        notification.expandedContentView = nil
        notification.clickableView.updateTrackingAreas()
        self.repositionNotifications()
      }
    }
  }
}
