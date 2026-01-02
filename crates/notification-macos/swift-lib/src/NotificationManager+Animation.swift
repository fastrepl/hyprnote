import Cocoa

extension NotificationManager {
  func showWithAnimation(
    notification: NotificationInstance, screen: NSScreen, timeoutSeconds: Double
  ) {
    let screenRect = screen.visibleFrame
    let finalXPos = screenRect.maxX - panelWidth() - Config.rightMargin + Config.buttonOverhang
    let currentFrame = notification.panel.frame

    notification.panel.setFrame(
      NSRect(
        x: screenRect.maxX + Config.slideInOffset,
        y: currentFrame.minY,
        width: panelWidth(),
        height: panelHeight()
      ),
      display: false
    )

    notification.panel.orderFrontRegardless()
    notification.panel.makeKeyAndOrderFront(nil)

    NSAnimationContext.runAnimationGroup({ context in
      context.duration = 0.3
      context.timingFunction = CAMediaTimingFunction(name: .easeOut)
      notification.panel.animator().setFrame(
        NSRect(
          x: finalXPos, y: currentFrame.minY, width: panelWidth(),
          height: panelHeight()),
        display: true
      )
      notification.panel.animator().alphaValue = 1.0
    }) {
      DispatchQueue.main.async {
        notification.clickableView.updateTrackingAreas()
        notification.clickableView.window?.invalidateCursorRects(for: notification.clickableView)
        notification.clickableView.window?.resetCursorRects()
        self.updateHoverForAll(atScreenPoint: NSEvent.mouseLocation)
      }
      notification.startDismissTimer(timeoutSeconds: timeoutSeconds)
    }
  }

  func animateExpansion(notification: NotificationInstance, isExpanded: Bool) {
    let targetHeight = panelHeight(expanded: isExpanded)
    let currentFrame = notification.panel.frame

    let heightDiff = targetHeight - currentFrame.height
    let newFrame = NSRect(
      x: currentFrame.minX,
      y: currentFrame.minY - heightDiff,
      width: currentFrame.width,
      height: targetHeight
    )

    guard
      let effectView = notification.clickableView.subviews.first?.subviews.first
        as? NSVisualEffectView
    else {
      notification.isAnimating = false
      return
    }

    if isExpanded {
      notification.compactContentView?.alphaValue = 1.0

      let expandedView = createExpandedNotificationView(notification: notification)
      expandedView.translatesAutoresizingMaskIntoConstraints = false
      expandedView.alphaValue = 0
      effectView.addSubview(expandedView)

      NSLayoutConstraint.activate([
        expandedView.leadingAnchor.constraint(equalTo: effectView.leadingAnchor, constant: 16),
        expandedView.trailingAnchor.constraint(equalTo: effectView.trailingAnchor, constant: -16),
        expandedView.topAnchor.constraint(equalTo: effectView.topAnchor, constant: 14),
        expandedView.bottomAnchor.constraint(equalTo: effectView.bottomAnchor, constant: -14),
      ])

      notification.expandedContentView = expandedView

      NSAnimationContext.runAnimationGroup({ context in
        context.duration = 0.25
        context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        notification.panel.animator().setFrame(newFrame, display: true)
        notification.compactContentView?.animator().alphaValue = 0
        expandedView.animator().alphaValue = 1.0
      }) {
        notification.compactContentView?.isHidden = true
        notification.isAnimating = false
        notification.clickableView.updateTrackingAreas()
        self.repositionNotifications()
      }
    } else {
      notification.stopCountdown()
      notification.expandedContentView?.removeFromSuperview()
      notification.expandedContentView = nil
      notification.compactContentView?.alphaValue = 0
      notification.compactContentView?.isHidden = false

      NSAnimationContext.runAnimationGroup({ context in
        context.duration = 0.25
        context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        notification.panel.animator().setFrame(newFrame, display: true)
        notification.compactContentView?.animator().alphaValue = 1.0
      }) {
        notification.isAnimating = false
        notification.clickableView.updateTrackingAreas()
        self.repositionNotifications()
      }
    }
  }
}
