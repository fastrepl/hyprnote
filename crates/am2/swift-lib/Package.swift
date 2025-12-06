// swift-tools-version:6.0

import PackageDescription

let package = Package(
  name: "swift-lib",
  platforms: [.macOS("13.0")],
  products: [
    .library(
      name: "swift-lib",
      type: .static,
      targets: ["swift-lib"])
  ],
  dependencies: [
    .package(
      url: "https://github.com/Brendonovich/swift-rs",
      revision: "01980f981bc642a6da382cc0788f18fdd4cde6df"),
    .package(
      id: "argmaxinc.argmax-sdk-swift",
      exact: "1.9.3"),
  ],
  targets: [
    .target(
      name: "swift-lib",
      dependencies: [
        .product(name: "SwiftRs", package: "swift-rs"),
        .product(name: "Argmax", package: "argmaxinc.argmax-sdk-swift")
      ],
      path: "src",
      swiftSettings: [
        .swiftLanguageMode(.v5)
      ]
    )
  ]
)

