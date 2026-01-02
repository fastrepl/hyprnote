import Cocoa

extension NotificationManager {
    func setupDisplayChangeObserver() {
        displayChangeObserver = NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.handleDisplayChange()
        }
    }

    func handleDisplayChange() {
        repositionNotifications(animated: false)
    }

    func getTargetScreen() -> NSScreen? {
        if let menuBarScreen = NSScreen.screens.first(where: { $0.frame.origin == .zero }) {
            return menuBarScreen
        }
        return NSScreen.main ?? NSScreen.screens.first
    }

    func repositionNotifications(animated: Bool = true) {
        guard let screen = getTargetScreen() else { return }
        let screenRect = screen.visibleFrame
        let rightPosition = screenRect.maxX - panelWidth() - Layout.rightMargin + Layout.buttonOverhang

        let sorted = activeNotifications.values.sorted { $0.panel.frame.minY > $1.panel.frame.minY }

        var currentY = screenRect.maxY - Layout.topMargin + Layout.buttonOverhang

        for notification in sorted {
            let height = notification.panel.frame.height
            currentY -= height
            let newFrame = NSRect(
                x: rightPosition,
                y: currentY,
                width: panelWidth(),
                height: height
            )
            currentY -= notificationSpacing

            if animated {
                NSAnimationContext.runAnimationGroup { context in
                    context.duration = Timing.dismiss
                    context.timingFunction = CAMediaTimingFunction(name: .easeOut)
                    notification.panel.animator().setFrame(newFrame, display: true)
                }
            } else {
                notification.panel.setFrame(newFrame, display: true)
                notification.clickableView.updateTrackingAreas()
                notification.clickableView.window?.invalidateCursorRects(for: notification.clickableView)
                notification.clickableView.window?.resetCursorRects()
            }
        }

        if !animated {
            updateHoverForAll(atScreenPoint: NSEvent.mouseLocation)
        }
    }

    func calculateYPosition(screen: NSScreen? = nil) -> CGFloat {
        let targetScreen = screen ?? getTargetScreen() ?? NSScreen.main!
        let screenRect = targetScreen.visibleFrame

        var occupiedHeight: CGFloat = 0
        for notification in activeNotifications.values {
            occupiedHeight += notification.panel.frame.height + notificationSpacing
        }

        let baseY = screenRect.maxY - panelHeight() - Layout.topMargin + Layout.buttonOverhang
        return baseY - occupiedHeight
    }

    func panelWidth() -> CGFloat {
        Layout.notificationWidth + Layout.buttonOverhang
    }

    func panelHeight(expanded: Bool = false) -> CGFloat {
        let contentHeight = expanded ? Layout.expandedNotificationHeight : Layout.notificationHeight
        return contentHeight + Layout.buttonOverhang
    }
}
