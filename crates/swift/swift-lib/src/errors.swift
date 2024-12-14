import CoreAudio

public enum AudioError: Error {
  case systemObjectRequired
  case invalidProcessIdentifier
  case propertyError
  case deviceError
  case invalidDevice
  case tapCreationError
  case aggregateDeviceError
}
