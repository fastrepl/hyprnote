import CoreAudio
import Foundation
import SwiftRs

public class AudioFormat: NSObject {
  public var channels: Int
  public var sample_rate: Int
  public var bits_per_sample: Int

  init(_ channels: Int, _ sample_rate: Int, _ bits_per_sample: Int) {
    self.channels = channels
    self.sample_rate = sample_rate
    self.bits_per_sample = bits_per_sample
  }
}

extension AudioFormat {
  // https://developer.apple.com/documentation/coreaudiotypes/audiostreambasicdescription
  convenience init(from description: AudioStreamBasicDescription) {
    let channels = Int(description.mChannelsPerFrame)
    let sampleRate = Int(description.mSampleRate)
    let bitsPerSample = Int(description.mBitsPerChannel)

    self.init(channels, sampleRate, bitsPerSample)
  }
}

public class IntArray: NSObject {
  var data: SRArray<Int16>

  init(_ data: [Int16]) {
    self.data = SRArray(data)
  }
}
