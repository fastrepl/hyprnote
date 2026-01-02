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
public func _showNotification(jsonPayload: SRString) -> Bool {
    let jsonString = jsonPayload.toString()

    guard let data = jsonString.data(using: .utf8),
        let payload = try? JSONDecoder().decode(NotificationPayload.self, from: data)
    else {
        return false
    }

    NotificationManager.shared.show(payload: payload)

    Thread.sleep(forTimeInterval: 0.1)
    return true
}

@_cdecl("_dismiss_all_notifications")
public func _dismissAllNotifications() -> Bool {
    NotificationManager.shared.dismissAll()
    return true
}
