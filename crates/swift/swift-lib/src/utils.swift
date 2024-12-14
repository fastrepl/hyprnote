// https://github.com/insidegui/AudioCap/blob/93881a4201cba1ee1cee558744492660caeaa3f1/AudioCap/ProcessTap/CoreAudioUtils.swift

import CoreAudio

public func getDefaultOutputDeviceID() throws -> AudioDeviceID {
  let id = try getAudioDeviceID(selector: kAudioHardwarePropertyDefaultOutputDevice)
  return id
}

public func getDefaultSystemOutputDeviceID() throws -> AudioDeviceID {
  let id = try getAudioDeviceID(selector: kAudioHardwarePropertyDefaultSystemOutputDevice)
  return id
}

public func getDefaultOutputDeviceUID() throws -> String {
  let id = try getDefaultOutputDeviceID()
  let uid = try getAudioDeviceUID(id: id)
  return uid as String
}

public func getDefaultSystemOutputDeviceUID() throws -> String {
  let id = try getDefaultSystemOutputDeviceID()
  let uid = try getAudioDeviceUID(id: id)
  return uid as String
}

private func getAudioDeviceUID(id: AudioDeviceID) throws -> CFString {
  var uid: CFString = "" as CFString
  var uidAddress = AudioObjectPropertyAddress(
    mSelector: kAudioDevicePropertyDeviceUID,
    mScope: kAudioObjectPropertyScopeGlobal,
    mElement: kAudioObjectPropertyElementMain
  )

  var propertySize = UInt32(MemoryLayout.size(ofValue: uid))

  if AudioObjectGetPropertyData(
    id,
    &uidAddress,
    0,
    nil,
    &propertySize,
    &uid) != kAudioHardwareNoError
  {
    throw AudioError.deviceError
  }

  return uid
}

// https://gist.github.com/suzp1984/03287abdb2a70b4d1686c3e847061c6e
private func getAudioDeviceID(selector: AudioObjectPropertySelector) throws -> AudioDeviceID {
  var id: AudioDeviceID = 0
  var address = AudioObjectPropertyAddress(
    mSelector: selector,
    mScope: kAudioObjectPropertyScopeGlobal,
    mElement: kAudioObjectPropertyElementMain)

  var propertySize = UInt32(MemoryLayout.size(ofValue: id))

  if AudioObjectGetPropertyData(
    AudioObjectID(kAudioObjectSystemObject),
    &address,
    0,
    nil,
    &propertySize,
    &id) != kAudioHardwareNoError
  {
    throw AudioError.deviceError
  }

  return id
}
