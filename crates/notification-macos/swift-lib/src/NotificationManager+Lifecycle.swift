import Cocoa

extension NotificationManager {
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
      effectView: effectView, container: container, title: title, message: message,
      notification: notification)

    activeNotifications[notification.key] = notification
    hoverStates[notification.key] = false

    showWithAnimation(notification: notification, screen: screen, timeoutSeconds: timeoutSeconds)
    ensureGlobalMouseMonitor()
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
}
