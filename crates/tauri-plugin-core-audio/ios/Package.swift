// swift-tools-version:5.9

import PackageDescription

let package = Package(
  name: "tauri-plugin-core-audio",
  // https://developer.apple.com/documentation/packagedescription/package/platforms
  platforms: [.macOS(.v14)],
  products: [
    .library(
      name: "tauri-plugin-core-audio",
      type: .static,
      targets: ["tauri-plugin-core-audio"])
  ],
  dependencies: [.package(name: "Tauri", path: "../.tauri/tauri-api") ],
  targets: [
    .target(
      name: "tauri-plugin-core-audio",
      dependencies: [.byName(name: "Tauri")],
      path: "Sources")
  ]
)
