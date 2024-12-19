// https://developer.apple.com/documentation/screencapturekit/capturing-screen-content-in-macos

import ScreenCaptureKit

public class AudioCaptureState {
  public static let shared = AudioCaptureState()

  private init() {}

  public func start() -> Bool {
    do {
      try _start()
      return true
    } catch {
      return false
    }
  }

  private func _start() throws {
    var displays: [SCDisplay] = []

    SCShareableContent.getCurrentProcessShareableContent(completionHandler: { (content, error) in
      if let content = content {
        displays = content.displays
      }
    })

    let filter = SCContentFilter(
      display: displays[0], excludingApplications: [], exceptingWindows: [])

    if !displays.isEmpty {
      throw ScreenCaptureError.any
    }

    let streamConfig = SCStreamConfiguration()
  }

  public func stop() -> Bool {
    do {
      try _stop()
      return true
    } catch {
      return false
    }
  }

  private func _stop() throws {

  }

}
