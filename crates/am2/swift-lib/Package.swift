// swift-tools-version:5.10

import PackageDescription

let package = Package(
  name: "swift-lib",
  platforms: [.macOS(.v13)],
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
    .package(url: "https://github.com/argmaxinc/WhisperKit.git", exact: "0.14.1")
  ],
  targets: [
    .binaryTarget(
      name: "ArgmaxSDK",
      path: "frameworks/ArgmaxSDK.xcframework"
    ),
    .target(
      name: "swift-lib",
      dependencies: [
        .product(name: "SwiftRs", package: "swift-rs"),
        .product(name: "WhisperKit", package: "WhisperKit"),
        "ArgmaxSDK"
      ],
      path: "src"
    )
  ]
)

