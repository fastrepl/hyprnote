import Cocoa

class NotificationManager {
  static let shared = NotificationManager()

  private init() {
    setupDisplayChangeObserver()
  }

  var activeNotifications: [String: NotificationInstance] = [:]
  let maxNotifications = 5
  let notificationSpacing: CGFloat = 10

  var globalMouseMonitor: Any?
  var hoverStates: [String: Bool] = [:]
  var displayChangeObserver: Any?

  struct Config {
    static let notificationWidth: CGFloat = 344
    static let notificationHeight: CGFloat = 64
    static let expandedNotificationHeight: CGFloat = 380
    static let rightMargin: CGFloat = 15
    static let topMargin: CGFloat = 15
    static let slideInOffset: CGFloat = 10
    static let buttonOverhang: CGFloat = 8
  }

  func show(payload: NotificationPayload) {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.setupApplicationIfNeeded()
      self.createAndShowNotification(payload: payload)
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
    activeNotifications.removeValue(forKey: notification.key)
    hoverStates.removeValue(forKey: notification.key)
    repositionNotifications()
    stopGlobalMouseMonitorIfNeeded()
  }

  func setupApplicationIfNeeded() {
    let app = NSApplication.shared
    if app.delegate == nil {
      app.setActivationPolicy(.accessory)
    }
  }

  func manageNotificationLimit() {
    while activeNotifications.count >= maxNotifications {
      if let oldest = activeNotifications.values.min(by: {
        $0.panel.frame.minY > $1.panel.frame.minY
      }) {
        oldest.dismiss()
      }
    }
  }

  deinit {
    if let observer = displayChangeObserver {
      NotificationCenter.default.removeObserver(observer)
    }
    if let monitor = globalMouseMonitor {
      NSEvent.removeMonitor(monitor)
    }
  }
}
