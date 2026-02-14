// swift-tools-version:5.9

import PackageDescription

let package = Package(
  name: "hypr-mlx-swift",
  platforms: [.macOS("15.0")],
  products: [
    .library(
      name: "hypr-mlx-swift",
      type: .static,
      targets: ["swift-lib"])
  ],
  dependencies: [
    .package(
      url: "https://github.com/Brendonovich/swift-rs",
      revision: "01980f981bc642a6da382cc0788f18fdd4cde6df"),
    .package(
      url: "https://github.com/Blaizzy/mlx-audio-swift.git",
      branch: "main"),
  ],
  targets: [
    .target(
      name: "swift-lib",
      dependencies: [
        .product(name: "SwiftRs", package: "swift-rs"),
        .product(name: "MLXAudioCore", package: "mlx-audio-swift"),
        .product(name: "MLXAudioSTT", package: "mlx-audio-swift"),
      ],
      path: "src"
    )
  ]
)
