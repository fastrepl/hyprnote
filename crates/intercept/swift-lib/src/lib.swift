import Cocoa

private var keyMonitor: Any?

@_silgen_name("rust_set_force_quit")
func rustSetForceQuit()

@_cdecl("_setup_force_quit_handler")
public func _setupForceQuitHandler() {
  keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
    let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
    let isCmd = flags.contains(.command)
    let isShift = flags.contains(.shift)
    let isQ = event.charactersIgnoringModifiers?.lowercased() == "q"

    if isCmd && isShift && isQ {
      rustSetForceQuit()
      NSApplication.shared.terminate(nil)
      return nil
    }
    return event
  }
}
