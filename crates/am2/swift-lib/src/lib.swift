import Argmax
import Foundation
import SwiftRs

private var isAM2Ready = false

@_cdecl("initialize_am2_sdk")
public func initialize_am2_sdk() {
  isAM2Ready = true
  print("AM2 SDK initialized successfully")
}

@_cdecl("check_am2_ready")
public func check_am2_ready() -> Bool {
  return isAM2Ready
}

