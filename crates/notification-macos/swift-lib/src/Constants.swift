import Cocoa

enum Layout {
  static let notificationWidth: CGFloat = 344
  static let notificationHeight: CGFloat = 64
  static let expandedNotificationHeight: CGFloat = 380
  static let rightMargin: CGFloat = 15
  static let topMargin: CGFloat = 15
  static let slideInOffset: CGFloat = 10
  static let buttonOverhang: CGFloat = 8
  static let cornerRadius: CGFloat = 14
  static let contentPaddingHorizontal: CGFloat = 12
  static let contentPaddingVertical: CGFloat = 9
  static let expandedPaddingHorizontal: CGFloat = 16
  static let expandedPaddingVertical: CGFloat = 14
}

enum Timing {
  static let slideIn: TimeInterval = 0.3
  static let expansion: TimeInterval = 0.25
  static let fadeIn: TimeInterval = 0.15
  static let dismiss: TimeInterval = 0.2
  static let buttonPress: TimeInterval = 0.08
  static let hoverFade: TimeInterval = 0.15
}

enum Fonts {
  static let titleSize: CGFloat = 14
  static let titleWeight: NSFont.Weight = .semibold
  static let bodySize: CGFloat = 11
  static let bodyWeight: NSFont.Weight = .regular
  static let buttonSize: CGFloat = 12
  static let buttonWeight: NSFont.Weight = .medium
  static let expandedTitleSize: CGFloat = 15
  static let detailLabelSize: CGFloat = 11
  static let detailValueSize: CGFloat = 12
  static let actionButtonSize: CGFloat = 13
}

enum Colors {
  static let buttonNormalBg = NSColor(calibratedWhite: 0.95, alpha: 0.9).cgColor
  static let buttonPressedBg = NSColor(calibratedWhite: 0.85, alpha: 0.9).cgColor
  static let notificationBg = NSColor(calibratedWhite: 0.92, alpha: 0.85).cgColor
  static let actionButtonBg = NSColor(calibratedWhite: 0.35, alpha: 0.95).cgColor
  static let closeButtonHoverBg = NSColor(calibratedWhite: 0.95, alpha: 1.0).cgColor
  static let closeButtonPressedBg = NSColor(calibratedWhite: 0.9, alpha: 1.0).cgColor
}

enum CloseButtonConfig {
  static let size: CGFloat = 20
  static let symbolPointSize: CGFloat = 9
}
