// swift-tools-version:5.9

import PackageDescription

let package = Package(
  name: "swift-lib",
  platforms: [.macOS("14.2")],
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
      url: "https://github.com/MrKai77/DynamicNotchKit",
      revision: "1ee629ada2adf45f8519d89119d702d3938fd5af")
  ],
  targets: [
    .target(
      name: "swift-lib",
      dependencies: [
        .product(name: "SwiftRs", package: "swift-rs"),
        .product(name: "DynamicNotchKit", package: "DynamicNotchKit")
      ],
      path: "src"
    )
  ]
)
