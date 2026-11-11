// swift-tools-version:5.5
// The Swift port, installable straight from this repository:
//   .package(url: "https://github.com/MihrabHQ/mihrab-methods", from: "1.3.2")
// The sources and their check are in ports/swift.
import PackageDescription

let package = Package(
    name: "MihrabMethods",
    products: [
        .library(name: "MihrabMethods", targets: ["MihrabMethods"]),
    ],
    targets: [
        .target(name: "MihrabMethods", path: "ports/swift/Sources/MihrabMethods"),
    ]
)
