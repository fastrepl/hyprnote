import Cocoa

extension NotificationManager {
  func createExpandedNotificationView(
    title: String,
    notification: NotificationInstance
  ) -> NSView {
    let container = NSStackView()
    container.orientation = .vertical
    container.alignment = .leading
    container.distribution = .fill
    container.spacing = 12

    let titleLabel = NSTextField(labelWithString: title)
    titleLabel.font = NSFont.systemFont(ofSize: 15, weight: .semibold)
    titleLabel.textColor = NSColor.labelColor
    titleLabel.lineBreakMode = .byTruncatingTail
    titleLabel.maximumNumberOfLines = 1
    container.addArrangedSubview(titleLabel)

    let participantsStack = createParticipantsSection()
    container.addArrangedSubview(participantsStack)

    let separator = NSBox()
    separator.boxType = .separator
    separator.translatesAutoresizingMaskIntoConstraints = false
    container.addArrangedSubview(separator)
    separator.widthAnchor.constraint(equalTo: container.widthAnchor).isActive = true

    let detailsStack = createDetailsSection()
    container.addArrangedSubview(detailsStack)

    let (actionStack, timerLabel) = createActionSection(notification: notification)
    container.addArrangedSubview(actionStack)
    actionStack.widthAnchor.constraint(equalTo: container.widthAnchor).isActive = true

    notification.startCountdown(label: timerLabel)

    return container
  }

  func createParticipantsSection() -> NSStackView {
    let stack = NSStackView()
    stack.orientation = .vertical
    stack.alignment = .leading
    stack.spacing = 4

    let participants: [(name: String, email: String, status: ParticipantStatus)] = [
      ("", "sjobs@apple.com", .accepted),
      ("John Jeong", "john@hyprnote.com", .accepted),
      ("Yujong Lee", "yujonglee@hyprnote.com", .maybe),
      ("Tony Stark", "tony@hyprnote.com", .declined),
    ]

    for participant in participants {
      let row = createParticipantRow(
        name: participant.name,
        email: participant.email,
        status: participant.status
      )
      stack.addArrangedSubview(row)
    }

    return stack
  }

  func createParticipantRow(name: String, email: String, status: ParticipantStatus)
    -> NSView
  {
    let row = NSStackView()
    row.orientation = .horizontal
    row.alignment = .centerY
    row.spacing = 6

    let displayText = name.isEmpty ? email : "\(name) (\(email))"
    let label = NSTextField(labelWithString: displayText)
    label.font = NSFont.systemFont(ofSize: 12, weight: .regular)
    label.textColor = NSColor.labelColor

    let statusIcon = NSTextField(labelWithString: status.icon)
    statusIcon.font = NSFont.systemFont(ofSize: 12)
    statusIcon.textColor = status.color

    row.addArrangedSubview(label)
    row.addArrangedSubview(statusIcon)

    return row
  }

  func createDetailsSection() -> NSStackView {
    let stack = NSStackView()
    stack.orientation = .vertical
    stack.alignment = .leading
    stack.spacing = 8

    let details: [(label: String, value: String)] = [
      ("What:", "Discovery call - Apple <> Hyprnote"),
      ("Invitee Time Zone:", "America/Cupertino"),
      ("Who:", "John Jeong - Organizer\njohn@hyprnote.com\nSteve\nsjobs@apple.com"),
      ("Where:", "... See more"),
    ]

    for detail in details {
      let row = createDetailRow(label: detail.label, value: detail.value)
      stack.addArrangedSubview(row)
    }

    return stack
  }

  func createDetailRow(label: String, value: String) -> NSView {
    let container = NSStackView()
    container.orientation = .vertical
    container.alignment = .leading
    container.spacing = 2

    let labelField = NSTextField(labelWithString: label)
    labelField.font = NSFont.systemFont(ofSize: 11, weight: .medium)
    labelField.textColor = NSColor.secondaryLabelColor

    let valueField = NSTextField(labelWithString: value)
    valueField.font = NSFont.systemFont(ofSize: 12, weight: .regular)
    valueField.textColor = NSColor.labelColor
    valueField.maximumNumberOfLines = 0
    valueField.lineBreakMode = .byWordWrapping

    container.addArrangedSubview(labelField)
    container.addArrangedSubview(valueField)

    return container
  }

  func createActionSection(notification: NotificationInstance) -> (
    NSStackView, NSTextField
  ) {
    let stack = NSStackView()
    stack.orientation = .vertical
    stack.alignment = .centerX
    stack.spacing = 8

    let actionButton = ActionButton()
    actionButton.title = "  Join Zoom & Start listening"
    actionButton.notification = notification
    actionButton.font = NSFont.systemFont(ofSize: 13, weight: .medium)
    actionButton.layer?.cornerRadius = 10
    actionButton.layer?.backgroundColor = NSColor(calibratedWhite: 0.35, alpha: 0.95).cgColor
    actionButton.contentTintColor = NSColor.white
    actionButton.translatesAutoresizingMaskIntoConstraints = false
    actionButton.heightAnchor.constraint(equalToConstant: 36).isActive = true

    let timerLabel = NSTextField(labelWithString: "")
    timerLabel.font = NSFont.systemFont(ofSize: 11, weight: .regular)
    timerLabel.textColor = NSColor.secondaryLabelColor
    timerLabel.alignment = .center

    stack.addArrangedSubview(actionButton)
    stack.addArrangedSubview(timerLabel)

    actionButton.widthAnchor.constraint(equalTo: stack.widthAnchor, constant: -24).isActive = true

    return (stack, timerLabel)
  }
}
