import Argmax
import Foundation
import SwiftRs

@_cdecl("initialize_am2_sdk")
public func initialize_am2_sdk(apiKey: SRString) {
  let semaphore = DispatchSemaphore(value: 0)

  Task {
    let key = apiKey.toString()
    if !key.isEmpty {
      await ArgmaxSDK.with(ArgmaxConfig(apiKey: key))
    }
    semaphore.signal()
  }

  semaphore.wait()
}
