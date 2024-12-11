import SwiftRs
import Tauri
import UIKit
import WebKit

import CoreAudio

class PingArgs: Decodable {
  let value: String?
}

// https://github.com/insidegui/AudioCap
// https://developer.apple.com/documentation/coreaudio/capturing-system-audio-with-core-audio-taps
class ExamplePlugin: Plugin {
  @objc public func ping(_ invoke: Invoke) throws {
    let b = CoreAudio.CATapMuteBehavior()
    let args = try invoke.parseArgs(PingArgs.self)
    invoke.resolve(["value": args.value ?? ""])
  }
}

@_cdecl("init_plugin_core_audio")
func initPlugin() -> Plugin {
  return ExamplePlugin()
}
