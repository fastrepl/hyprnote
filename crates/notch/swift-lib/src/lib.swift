import AppKit
import DynamicNotchKit
import Foundation
import SwiftRs
import SwiftUI

class NotchHoverState: ObservableObject {
  @Published var isHovering = false
  weak var notch: AnyObject?

  func onHoverChanged(_ hovering: Bool) {
    guard isHovering != hovering else { return }
    isHovering = hovering

    Task { @MainActor in
      guard let notch = notch as? DynamicNotch<AnyView, AnyView, EmptyView> else { return }

      if hovering {
        await notch.expand()
      } else {
        await notch.compact()
      }
    }
  }
}

private var notchInstance: DynamicNotch<AnyView, AnyView, EmptyView>?
private var hoverState = NotchHoverState()

struct NotchExpandedView: View {
  let text: String
  let iconName: String
  @ObservedObject var hoverState: NotchHoverState

  var body: some View {
    HStack(spacing: 8) {
      Image(systemName: iconName)
        .foregroundStyle(.white)
      Text(text)
        .font(.system(size: 14, weight: .medium))
        .foregroundStyle(.white)
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 8)
    .background(Color.black.opacity(0.85))
    .cornerRadius(20)
    .onContinuousHover { phase in
      switch phase {
      case .active:
        hoverState.onHoverChanged(true)
      case .ended:
        hoverState.onHoverChanged(false)
      }
    }
  }
}

struct NotchCompactView: View {
  let iconName: String
  @ObservedObject var hoverState: NotchHoverState

  var body: some View {
    Image(systemName: iconName)
      .font(.system(size: 12, weight: .medium))
      .foregroundStyle(.white)
      .padding(.horizontal, 8)
      .padding(.vertical, 4)
      .background(Color.black.opacity(0.6))
      .cornerRadius(12)
      .onContinuousHover { phase in
        switch phase {
        case .active:
          hoverState.onHoverChanged(true)
        case .ended:
          hoverState.onHoverChanged(false)
        }
      }
  }
}

@_cdecl("notch_show_info")
func notch_show_info(
  title: SRString,
  description: SRString,
  iconName: SRString
) {
  Task { @MainActor in
    let titleStr = title.toString()
    let iconStr = iconName.toString()

    let notch = DynamicNotch(
      hoverBehavior: [.keepVisible, .hapticFeedback],
      style: .notch
    ) {
      AnyView(
        NotchExpandedView(text: titleStr, iconName: iconStr, hoverState: hoverState)
      )
    } compactLeading: {
      AnyView(
        NotchCompactView(iconName: iconStr, hoverState: hoverState)
      )
    }

    hoverState.notch = notch
    notchInstance = notch

    await notch.compact()
  }
}

@_cdecl("notch_hide")
func notch_hide() {
  Task { @MainActor in
    try? await Task.sleep(for: .milliseconds(50))
    await notchInstance?.hide()
    notchInstance = nil
    hoverState.notch = nil
  }
}

@_cdecl("notch_compact")
func notch_compact() {
  Task { @MainActor in
    await notchInstance?.compact()
  }
}
