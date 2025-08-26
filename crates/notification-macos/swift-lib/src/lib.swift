import SwiftRs
import Cocoa
import AVFoundation

// NOTIFICATION FEATURES:
// - Audio: Plays system notification sound ("Ping") when shown
// - Clickable: Click anywhere on the notification to dismiss immediately
// - Auto-dismiss timeout: Automatically closes after 5 seconds if not clicked
// - Animation: Slides in from right with fade-in, slides out to right with fade-out
// - Visual: Native macOS appearance with blur effect and rounded corners

// Store panel reference to prevent deallocation
private var sharedPanel: NSPanel?

// Custom view that handles clicks to dismiss notification
class ClickableView: NSView {
  var trackingArea: NSTrackingArea?
  var isHovering = false
  
  override func updateTrackingAreas() {
    super.updateTrackingAreas()
    
    if let existingArea = trackingArea {
      removeTrackingArea(existingArea)
    }
    
    let options: NSTrackingArea.Options = [
      .activeAlways,
      .mouseEnteredAndExited,
      .inVisibleRect
    ]
    
    trackingArea = NSTrackingArea(rect: bounds, options: options, owner: self, userInfo: nil)
    if let area = trackingArea {
      addTrackingArea(area)
    }
  }
  
  override func mouseEntered(with event: NSEvent) {
    isHovering = true
    NSCursor.pointingHand.set()
  }
  
  override func mouseExited(with event: NSEvent) {
    isHovering = false
    NSCursor.arrow.set()
  }
  
  override func mouseDown(with event: NSEvent) {
    if let panel = sharedPanel {
      // Slide out to the right with fade
      NSAnimationContext.runAnimationGroup({ context in
        context.duration = 0.25
        context.timingFunction = CAMediaTimingFunction(name: .easeIn)
        
        let currentFrame = panel.frame
        let targetFrame = NSRect(
          x: currentFrame.origin.x + currentFrame.width,
          y: currentFrame.origin.y,
          width: currentFrame.width,
          height: currentFrame.height
        )
        
        panel.animator().setFrame(targetFrame, display: true)
        panel.animator().alphaValue = 0
      }) {
        panel.close()
        sharedPanel = nil
      }
    }
  }
}

// Play notification sound
private func playNotificationSound() {
  // Use system notification sound
  NSSound(named: .init("Ping"))?.play()
  // Alternative sounds available:
  // "Basso", "Blow", "Bottle", "Frog", "Funk", "Glass", "Hero", 
  // "Morse", "Ping", "Pop", "Purr", "Sosumi", "Submarine", "Tink"
}

@_cdecl("_show")
public func _show() -> Bool {
  // Initialize NSApplication if not already initialized
  let app = NSApplication.shared
  
  // Use async to avoid potential deadlocks
  DispatchQueue.main.async {
    // Initialize the app if needed
    if app.delegate == nil {
      app.setActivationPolicy(.regular)
    }
    
    // Get screen dimensions
    guard let screen = NSScreen.main else { return }
    let screenRect = screen.visibleFrame
    
    // Notification dimensions (like native macOS notifications)
    let notificationWidth: CGFloat = 360
    let notificationHeight: CGFloat = 80
    let rightMargin: CGFloat = 12
    let topMargin: CGFloat = 12
    
    // Calculate final position (top-right corner)
    let finalXPos = screenRect.maxX - notificationWidth - rightMargin
    let finalYPos = screenRect.maxY - notificationHeight - topMargin
    
    // Start position (off-screen to the right)
    let startXPos = screenRect.maxX + 10
    
    // Create NSPanel with borderless style (no title bar)
    let panel = NSPanel(
      contentRect: NSRect(x: startXPos, y: finalYPos, width: notificationWidth, height: notificationHeight),
      styleMask: [.borderless, .nonactivatingPanel],
      backing: .buffered,
      defer: false
    )
    
    // Configure panel appearance
    panel.level = .floating // Use floating level for notifications
    panel.isFloatingPanel = true
    panel.hidesOnDeactivate = false
    panel.isOpaque = false
    panel.backgroundColor = .clear
    panel.hasShadow = true
    panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .transient, .ignoresCycle]
    panel.isMovableByWindowBackground = false
    panel.alphaValue = 0 // Start invisible for fade-in
    
    // Create custom content view with rounded corners and background
    let contentView = NSView(frame: NSRect(x: 0, y: 0, width: notificationWidth, height: notificationHeight))
    contentView.wantsLayer = true
    contentView.layer?.cornerRadius = 10
    contentView.layer?.masksToBounds = true
    
    // Shadow configuration for depth
    contentView.layer?.shadowColor = NSColor.black.cgColor
    contentView.layer?.shadowOpacity = 0.2
    contentView.layer?.shadowOffset = CGSize(width: 0, height: 2)
    contentView.layer?.shadowRadius = 8
    
    // Use visual effect view for native blur background
    let visualEffectView = NSVisualEffectView(frame: contentView.bounds)
    visualEffectView.material = .popover // More native-like material
    visualEffectView.state = .active
    visualEffectView.blendingMode = .behindWindow
    visualEffectView.wantsLayer = true
    visualEffectView.layer?.cornerRadius = 10
    contentView.addSubview(visualEffectView)
    
    // Create horizontal stack view for icon and text
    let horizontalStack = NSStackView()
    horizontalStack.orientation = .horizontal
    horizontalStack.alignment = .centerY
    horizontalStack.spacing = 12
    horizontalStack.edgeInsets = NSEdgeInsets(top: 15, left: 15, bottom: 15, right: 15)
    horizontalStack.translatesAutoresizingMaskIntoConstraints = false
    
    // Create app icon (bell emoji as placeholder)
    let iconView = NSTextField(labelWithString: "🔔")
    iconView.font = NSFont.systemFont(ofSize: 28)
    iconView.alignment = .center
    iconView.backgroundColor = .clear
    iconView.isBezeled = false
    iconView.isEditable = false
    iconView.widthAnchor.constraint(equalToConstant: 40).isActive = true
    horizontalStack.addArrangedSubview(iconView)
    
    // Create vertical stack for title and message
    let textStack = NSStackView()
    textStack.orientation = .vertical
    textStack.alignment = .leading
    textStack.spacing = 2
    
    // Create title label
    let titleLabel = NSTextField(labelWithString: "Hyprnote")
    titleLabel.font = NSFont.systemFont(ofSize: 13, weight: .semibold)
    titleLabel.textColor = .labelColor
    titleLabel.backgroundColor = .clear
    titleLabel.isBezeled = false
    titleLabel.isEditable = false
    textStack.addArrangedSubview(titleLabel)
    
    // Create message label
    let messageLabel = NSTextField(labelWithString: "Your notification is ready")
    messageLabel.font = NSFont.systemFont(ofSize: 12)
    messageLabel.textColor = .secondaryLabelColor
    messageLabel.backgroundColor = .clear
    messageLabel.isBezeled = false
    messageLabel.isEditable = false
    messageLabel.lineBreakMode = .byTruncatingTail
    messageLabel.maximumNumberOfLines = 2
    textStack.addArrangedSubview(messageLabel)
    
    horizontalStack.addArrangedSubview(textStack)
    
    // Add stack to visual effect view
    visualEffectView.addSubview(horizontalStack)
    
    // Set up constraints
    NSLayoutConstraint.activate([
      horizontalStack.leadingAnchor.constraint(equalTo: visualEffectView.leadingAnchor),
      horizontalStack.trailingAnchor.constraint(equalTo: visualEffectView.trailingAnchor),
      horizontalStack.topAnchor.constraint(equalTo: visualEffectView.topAnchor),
      horizontalStack.bottomAnchor.constraint(equalTo: visualEffectView.bottomAnchor)
    ])
    
    // Create clickable content view
    let clickableContentView = ClickableView(frame: NSRect(x: 0, y: 0, width: notificationWidth, height: notificationHeight))
    clickableContentView.wantsLayer = true
    clickableContentView.layer?.cornerRadius = 10
    clickableContentView.layer?.masksToBounds = true
    
    // Move visual effect view to clickable content view
    contentView.removeFromSuperview()
    clickableContentView.addSubview(visualEffectView)
    
    // Set the clickable content view as panel's content
    panel.contentView = clickableContentView
    
    // Store panel reference to prevent deallocation
    sharedPanel = panel
    
    // Show the panel (starts off-screen to the right)
    panel.makeKeyAndOrderFront(nil)
    
    // Play notification sound
    playNotificationSound()
    
    // Animate slide-in from right with fade-in
    NSAnimationContext.runAnimationGroup({ context in
      context.duration = 0.35
      context.timingFunction = CAMediaTimingFunction(name: .easeOut)
      panel.animator().setFrame(
        NSRect(x: finalXPos, y: finalYPos, width: notificationWidth, height: notificationHeight),
        display: true
      )
      panel.animator().alphaValue = 1.0
    }) {
      // Auto-dismiss after 5 seconds if not clicked
      DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
        if let currentPanel = sharedPanel {
          // Animate slide-out to right with fade
          NSAnimationContext.runAnimationGroup({ context in
            context.duration = 0.3
            context.timingFunction = CAMediaTimingFunction(name: .easeIn)
            
            let exitFrame = NSRect(
              x: screenRect.maxX + 10,
              y: finalYPos,
              width: notificationWidth,
              height: notificationHeight
            )
            
            currentPanel.animator().setFrame(exitFrame, display: true)
            currentPanel.animator().alphaValue = 0
          }) {
            currentPanel.close()
            sharedPanel = nil
          }
        }
      }
    }
    
  }
  
  // Give some time for the async block to execute
  Thread.sleep(forTimeInterval: 0.1)
  
  return true
}
