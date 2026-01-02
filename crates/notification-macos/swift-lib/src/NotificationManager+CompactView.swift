import Cocoa

extension NotificationManager {
  func createNotificationView(notification: NotificationInstance) -> NSView {
    let container = NSStackView()
    container.orientation = .horizontal
    container.alignment = .centerY
    container.distribution = .fill
    container.spacing = 8

    let iconContainer = NSView()
    iconContainer.wantsLayer = true
    iconContainer.layer?.cornerRadius = 6
    iconContainer.translatesAutoresizingMaskIntoConstraints = false
    iconContainer.widthAnchor.constraint(equalToConstant: 32).isActive = true
    iconContainer.heightAnchor.constraint(equalToConstant: 32).isActive = true

    let iconImageView = createAppIconView()
    iconContainer.addSubview(iconImageView)
    NSLayoutConstraint.activate([
      iconImageView.centerXAnchor.constraint(equalTo: iconContainer.centerXAnchor),
      iconImageView.centerYAnchor.constraint(equalTo: iconContainer.centerYAnchor),
      iconImageView.widthAnchor.constraint(equalToConstant: 24),
      iconImageView.heightAnchor.constraint(equalToConstant: 24),
    ])

    let textStack = NSStackView()
    textStack.orientation = .vertical
    textStack.spacing = 2
    textStack.alignment = .leading
    textStack.distribution = .fill

    textStack.setContentHuggingPriority(.defaultLow, for: .horizontal)
    textStack.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

    let titleLabel = NSTextField(labelWithString: notification.payload.title)
    titleLabel.font = NSFont.systemFont(ofSize: 14, weight: .semibold)
    titleLabel.textColor = NSColor.labelColor
    titleLabel.lineBreakMode = .byTruncatingTail
    titleLabel.maximumNumberOfLines = 1
    titleLabel.allowsDefaultTighteningForTruncation = true
    titleLabel.usesSingleLineMode = true
    titleLabel.cell?.truncatesLastVisibleLine = true

    titleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

    let bodyLabel = NSTextField(labelWithString: notification.payload.message)
    bodyLabel.font = NSFont.systemFont(ofSize: 11, weight: .regular)
    bodyLabel.textColor = NSColor.secondaryLabelColor
    bodyLabel.lineBreakMode = .byTruncatingTail
    bodyLabel.maximumNumberOfLines = 1
    bodyLabel.usesSingleLineMode = true
    bodyLabel.cell?.truncatesLastVisibleLine = true

    bodyLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

    textStack.addArrangedSubview(titleLabel)
    textStack.addArrangedSubview(bodyLabel)

    let detailsButton = DetailsButton()
    detailsButton.title = "Details"
    detailsButton.notification = notification
    detailsButton.setContentHuggingPriority(.required, for: .horizontal)

    container.addArrangedSubview(iconContainer)
    container.addArrangedSubview(textStack)
    container.addArrangedSubview(detailsButton)

    return container
  }
}
