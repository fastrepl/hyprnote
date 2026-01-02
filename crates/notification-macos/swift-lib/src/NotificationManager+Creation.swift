import Cocoa

extension NotificationManager {
    func createPanel(screen: NSScreen? = nil, yPosition: CGFloat) -> NSPanel {
        let targetScreen = screen ?? getTargetScreen() ?? NSScreen.main!
        let screenRect = targetScreen.visibleFrame
        let startXPos = screenRect.maxX + Layout.slideInOffset

        let panel = NSPanel(
            contentRect: NSRect(
                x: startXPos, y: yPosition, width: panelWidth(),
                height: panelHeight()),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false,
            screen: targetScreen
        )

        panel.level = NSWindow.Level(rawValue: Int(Int32.max))
        panel.isFloatingPanel = true
        panel.hidesOnDeactivate = false
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .ignoresCycle]
        panel.isMovableByWindowBackground = false
        panel.alphaValue = 0

        panel.ignoresMouseEvents = false
        panel.acceptsMouseMovedEvents = true
        return panel
    }

    func createClickableView() -> ClickableView {
        let v = ClickableView(
            frame: NSRect(x: 0, y: 0, width: panelWidth(), height: panelHeight()))
        v.wantsLayer = true
        v.layer?.backgroundColor = NSColor.clear.cgColor
        v.autoresizingMask = [.width, .height]
        return v
    }

    func createContainer(clickableView: ClickableView) -> NSView {
        let overhang = Layout.buttonOverhang
        let container = NSView(
            frame: NSRect(
                x: overhang,
                y: 0,
                width: clickableView.bounds.width - overhang,
                height: clickableView.bounds.height - overhang
            )
        )
        container.wantsLayer = true
        container.layer?.cornerRadius = Layout.cornerRadius
        container.layer?.masksToBounds = false
        container.autoresizingMask = [.width, .height]
        container.layer?.shadowColor = NSColor.black.cgColor
        container.layer?.shadowOpacity = 0.22
        container.layer?.shadowOffset = CGSize(width: 0, height: 2)
        container.layer?.shadowRadius = 12
        return container
    }

    func createEffectView(container: NSView) -> NSVisualEffectView {
        let effectView = NSVisualEffectView(frame: container.bounds)
        effectView.material = .popover
        effectView.state = .active
        effectView.blendingMode = .behindWindow
        effectView.wantsLayer = true
        effectView.layer?.cornerRadius = Layout.cornerRadius
        effectView.layer?.masksToBounds = true
        effectView.autoresizingMask = [.width, .height]

        let backgroundView = NotificationBackgroundView(frame: effectView.bounds)
        backgroundView.autoresizingMask = [.width, .height]
        effectView.addSubview(backgroundView, positioned: .below, relativeTo: nil)

        container.addSubview(effectView)
        return effectView
    }

    func createAppIconView() -> NSImageView {
        let imageView = NSImageView()
        if let appIcon = NSApp.applicationIconImage {
            imageView.image = appIcon
        } else {
            imageView.image = NSImage(named: NSImage.applicationIconName)
        }
        imageView.imageScaling = .scaleProportionallyUpOrDown
        imageView.translatesAutoresizingMaskIntoConstraints = false
        imageView.wantsLayer = true
        imageView.layer?.shadowColor = NSColor.black.cgColor
        imageView.layer?.shadowOpacity = 0.3
        imageView.layer?.shadowOffset = CGSize(width: 0, height: 1)
        imageView.layer?.shadowRadius = 2
        return imageView
    }

    func createCloseButton(
        clickableView: ClickableView, container: NSView, notification: NotificationInstance
    )
        -> CloseButton
    {
        let closeButton = CloseButton()
        closeButton.notification = notification
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        clickableView.addSubview(closeButton, positioned: .above, relativeTo: nil)

        let buttonOffset = (CloseButtonConfig.size / 2) - 2
        NSLayoutConstraint.activate([
            closeButton.centerYAnchor.constraint(equalTo: container.topAnchor, constant: buttonOffset),
            closeButton.centerXAnchor.constraint(
                equalTo: container.leadingAnchor, constant: buttonOffset),
            closeButton.widthAnchor.constraint(equalToConstant: CloseButtonConfig.size),
            closeButton.heightAnchor.constraint(equalToConstant: CloseButtonConfig.size),
        ])
        return closeButton
    }

    func setupCloseButtonHover(clickableView: ClickableView, closeButton: CloseButton) {
        closeButton.alphaValue = 0
        closeButton.isHidden = true

        clickableView.onHover = { isHovering in
            if isHovering { closeButton.isHidden = false }
            NSAnimationContext.runAnimationGroup(
                { context in
                    context.duration = Timing.hoverFade
                    context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
                    closeButton.animator().alphaValue = isHovering ? 1.0 : 0
                },
                completionHandler: {
                    if !isHovering { closeButton.isHidden = true }
                }
            )
        }
    }
}
