import Foundation
import SwiftRs

@_silgen_name("rust_on_notification_confirm")
func rustOnNotificationConfirm(_ keyPtr: UnsafePointer<CChar>)

@_silgen_name("rust_on_notification_accept")
func rustOnNotificationAccept(_ keyPtr: UnsafePointer<CChar>)

@_silgen_name("rust_on_notification_dismiss")
func rustOnNotificationDismiss(_ keyPtr: UnsafePointer<CChar>)

@_silgen_name("rust_on_notification_timeout")
func rustOnNotificationTimeout(_ keyPtr: UnsafePointer<CChar>)

@_cdecl("_show_notification")
public func _showNotification(
  key: SRString,
  title: SRString,
  message: SRString,
  timeoutSeconds: Double,
  startTime: Int64
) -> Bool {
  let keyStr = key.toString()
  let titleStr = title.toString()
  let messageStr = message.toString()

  NotificationManager.shared.show(
    key: keyStr,
    title: titleStr,
    message: messageStr,
    timeoutSeconds: timeoutSeconds,
    startTime: startTime > 0 ? Date(timeIntervalSince1970: TimeInterval(startTime)) : nil
  )

  Thread.sleep(forTimeInterval: 0.1)
  return true
}

@_cdecl("_dismiss_all_notifications")
public func _dismissAllNotifications() -> Bool {
  NotificationManager.shared.dismissAll()
  return true
}
