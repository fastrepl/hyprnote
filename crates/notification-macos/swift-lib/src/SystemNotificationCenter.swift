import Foundation
import UserNotifications

class SystemNotificationCenter: NSObject, UNUserNotificationCenterDelegate {
  static let shared = SystemNotificationCenter()

  private var isAuthorized = false

  private override init() {
    super.init()
    UNUserNotificationCenter.current().delegate = self
  }

  func requestAuthorization() {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) {
      [weak self] granted, error in
      if let error = error {
        print("Notification authorization error: \(error)")
        return
      }
      self?.isAuthorized = granted
    }
  }

  func postToNotificationCenter(payload: NotificationPayload) {
    guard isAuthorized else {
      requestAuthorization()
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
        self?.postNotificationInternal(payload: payload)
      }
      return
    }

    postNotificationInternal(payload: payload)
  }

  private func postNotificationInternal(payload: NotificationPayload) {
    let content = UNMutableNotificationContent()
    content.title = payload.title
    content.body = payload.message
    content.sound = .default
    content.userInfo = ["key": payload.key]

    if let eventDetails = payload.eventDetails {
      var subtitle = eventDetails.what
      if let location = eventDetails.location, !location.isEmpty {
        subtitle += " • \(location)"
      }
      content.subtitle = subtitle
    }

    let request = UNNotificationRequest(
      identifier: payload.key,
      content: content,
      trigger: nil
    )

    UNUserNotificationCenter.current().add(request) { error in
      if let error = error {
        print("Failed to add notification to center: \(error)")
      }
    }
  }

  func removeFromNotificationCenter(key: String) {
    UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [key])
  }

  func removeAllFromNotificationCenter() {
    UNUserNotificationCenter.current().removeAllDeliveredNotifications()
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([])
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let key = response.notification.request.identifier

    switch response.actionIdentifier {
    case UNNotificationDefaultActionIdentifier:
      RustBridge.onCollapsedConfirm(key: key)
    case UNNotificationDismissActionIdentifier:
      RustBridge.onDismiss(key: key)
    default:
      break
    }

    completionHandler()
  }
}
