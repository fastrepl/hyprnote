import Foundation
import SwiftRs

public class IntArray: NSObject {
  var data: SRArray<Int16>

  init(_ data: [Int16]) {
    self.data = SRArray(data)
  }
}
