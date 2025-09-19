import SwiftRs
import Foundation
import DynamicNotchKit
import SwiftUI

@_cdecl("_show_notch")
public func _showNotch() -> Bool {
    Task { @MainActor in
        let notch = DynamicNotchInfo(
            icon: .init(systemName: "sparkles"),
            title: "Hyprnote",
            description: "Your meeting assistant is ready"
        )
        await notch.expand()
    }
    
    Thread.sleep(forTimeInterval: 5.0)
    return true
}
