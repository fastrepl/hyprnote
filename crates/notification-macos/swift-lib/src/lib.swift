import Foundation
import SwiftRs

@_silgen_name("rust_on_collapsed_confirm")
func rustOnCollapsedConfirm(_ keyPtr: UnsafePointer<CChar>)

@_silgen_name("rust_on_expanded_accept")
func rustOnExpandedAccept(_ keyPtr: UnsafePointer<CChar>)

@_silgen_name("rust_on_dismiss")
func rustOnDismiss(_ keyPtr: UnsafePointer<CChar>)

@_silgen_name("rust_on_collapsed_timeout")
func rustOnCollapsedTimeout(_ keyPtr: UnsafePointer<CChar>)

@_silgen_name("rust_on_expanded_start_time_reached")
func rustOnExpandedStartTimeReached(_ keyPtr: UnsafePointer<CChar>)

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
