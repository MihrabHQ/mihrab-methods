// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "MihrabMethods",
    products: [
        .library(name: "MihrabMethods", targets: ["MihrabMethods"]),
    ],
    targets: [
        .target(name: "MihrabMethods"),
        .executableTarget(name: "mihrab-vectors", dependencies: ["MihrabMethods"]),
    ]
)
