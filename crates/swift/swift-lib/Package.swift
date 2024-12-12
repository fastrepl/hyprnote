// swift-tools-version:5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
  name: "swift-lib",
  platforms: [.macOS(.v14)],
  products: [
    .library(
      name: "swift-lib",
      type: .static,
      targets: ["swift-lib"])
  ],
  dependencies: [
    .package(url: "https://github.com/Brendonovich/swift-rs", from: "1.0.7")
  ],
  targets: [
    .target(
      name: "swift-lib",
      dependencies: [.product(name: "SwiftRs", package: "swift-rs")],
      path: "src",
      linkerSettings: [
        .linkedFramework("CoreAudio"),
        .linkedFramework("Foundation"),
      ]
    )
  ]
)
