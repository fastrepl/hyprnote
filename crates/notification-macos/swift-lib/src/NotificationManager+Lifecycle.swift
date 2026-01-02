import Cocoa

extension NotificationManager {
  func createAndShowNotification(payload: NotificationPayload) {
    guard let screen = getTargetScreen() else { return }

    manageNotificationLimit()

    let yPosition = calculateYPosition(screen: screen)
    let panel = createPanel(screen: screen, yPosition: yPosition)
    let clickableView = createClickableView()
    let container = createContainer(clickableView: clickableView)
    let effectView = createEffectView(container: container)

    let notification = NotificationInstance(
      payload: payload, panel: panel, clickableView: clickableView)
    clickableView.notification = notification

    clickableView.addSubview(container)
    panel.contentView = clickableView

    setupContent(effectView: effectView, container: container, notification: notification)

    activeNotifications[notification.key] = notification
    hoverStates[notification.key] = false

    showWithAnimation(
      notification: notification, screen: screen, timeoutSeconds: payload.timeoutSeconds)
    ensureGlobalMouseMonitor()
  }

  func setupContent(
    effectView: NSVisualEffectView,
    container: NSView,
    notification: NotificationInstance
  ) {
    let contentView = createNotificationView(notification: notification)
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
