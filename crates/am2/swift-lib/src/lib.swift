import Argmax
import Foundation
import SwiftRs

private var vadInstance: VoiceActivityDetector?
private var whisperKitProInstance: WhisperKitPro?

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

public class VadResultArray: NSObject {
  var data: SRArray<Bool>

  init(_ data: [Bool]) {
    self.data = SRArray(data)
  }
}

@_cdecl("am2_vad_init")
public func am2_vad_init() -> Bool {
  let semaphore = DispatchSemaphore(value: 0)
  var success = false

  Task {
    do {
      vadInstance = try await VoiceActivityDetector.modelVAD()
      success = true
    } catch {
      success = false
    }
    semaphore.signal()
  }

  semaphore.wait()
  return success
}

@_cdecl("am2_vad_detect")
public func am2_vad_detect(
  samplesPtr: UnsafePointer<Float>,
  samplesLen: Int
) -> VadResultArray {
  guard let vad = vadInstance else {
    return VadResultArray([])
  }

  let audioArray = Array(UnsafeBufferPointer(start: samplesPtr, count: samplesLen))
  let voiceSegments = vad.voiceActivity(in: audioArray)

  return VadResultArray(voiceSegments)
}

@_cdecl("am2_vad_index_to_seconds")
public func am2_vad_index_to_seconds(index: Int) -> Float {
  guard let vad = vadInstance else {
    return 0.0
  }
  return vad.voiceActivityIndexToSeconds(index)
}

public class TranscribeResult: NSObject {
  var text: SRString
  var success: Bool

  init(text: String, success: Bool) {
    self.text = SRString(text)
    self.success = success
  }
}

@_cdecl("am2_transcribe_init")
public func am2_transcribe_init(model: SRString) -> Bool {
  let semaphore = DispatchSemaphore(value: 0)
  var success = false

  Task {
    do {
      let modelName = model.toString()
      let config = WhisperKitProConfig(model: modelName)
      whisperKitProInstance = try await WhisperKitPro(config)
      success = true
    } catch {
      success = false
    }
    semaphore.signal()
  }

  semaphore.wait()
  return success
}

@_cdecl("am2_transcribe_is_ready")
public func am2_transcribe_is_ready() -> Bool {
  return whisperKitProInstance != nil
}

@_cdecl("am2_transcribe_file")
public func am2_transcribe_file(audioPath: SRString) -> TranscribeResult {
  let semaphore = DispatchSemaphore(value: 0)
  var resultText = ""
  var success = false

  Task {
    guard let whisperKit = whisperKitProInstance else {
      semaphore.signal()
      return
    }

    do {
      let path = audioPath.toString()
      let results = try await whisperKit.transcribe(audioPath: path)
      resultText = WhisperKitProUtils.mergeTranscriptionResults(results).text
      success = true
    } catch {
      resultText = ""
      success = false
    }
    semaphore.signal()
  }

  semaphore.wait()
  return TranscribeResult(text: resultText, success: success)
}
