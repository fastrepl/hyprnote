import Cocoa

private var interceptor: QuitInterceptor?
private var keyMonitor: Any?

class QuitInterceptor: NSObject, NSApplicationDelegate {
  private let originalDelegate: NSApplicationDelegate?

  init(originalDelegate: NSApplicationDelegate?) {
    self.originalDelegate = originalDelegate
    super.init()
  }

  func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
    return rustShouldQuit() ? .terminateNow : .terminateCancel
  }

  override func responds(to aSelector: Selector!) -> Bool {
    if aSelector == #selector(NSApplicationDelegate.applicationShouldTerminate(_:)) {
      return true
    }
    return originalDelegate?.responds(to: aSelector) ?? false
  }

  override func forwardingTarget(for aSelector: Selector!) -> Any? {
    if aSelector == #selector(NSApplicationDelegate.applicationShouldTerminate(_:)) {
      return nil
    }
    return originalDelegate
  }
}

@_silgen_name("rust_should_quit")
func rustShouldQuit() -> Bool

@_cdecl("_setup_quit_handler")
public func _setupQuitHandler() {
  let app = NSApplication.shared
  let originalDelegate = app.delegate

  interceptor = QuitInterceptor(originalDelegate: originalDelegate)
  app.delegate = interceptor

  keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
    let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
    let isCmd = flags.contains(.command)
    let isShift = flags.contains(.shift)
    let isQ = event.charactersIgnoringModifiers?.lowercased() == "q"

    if isCmd && isShift && isQ {
      NSApplication.shared.terminate(nil)
      return nil
    }
    return event
  }
}
