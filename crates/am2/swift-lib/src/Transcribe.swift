import Argmax
import Foundation
import SwiftRs

@_silgen_name("rust_on_transcribe_progress")
func rust_on_transcribe_progress(_ fraction: Float) -> Bool

var whisperKitProInstance: WhisperKitPro?

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
      let modelPath = model.toString()
      let config = WhisperKitProConfig(modelFolder: modelPath)
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

@_cdecl("am2_transcribe_file_with_progress")
public func am2_transcribe_file_with_progress(audioPath: SRString) -> TranscribeResult {
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
      let results = try await whisperKit.transcribe(
        audioPath: path,
        decodeOptions: nil,
        callback: { _ in
          let fraction = Float(whisperKit.progress.fractionCompleted)
          return rust_on_transcribe_progress(fraction)
        }
      )
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
