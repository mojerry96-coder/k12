// Lifts the foreground subject out of every PNG in a folder (macOS Vision, "Lift subject"),
// writing same-size transparent PNGs to another folder. usage: swift liftdir.swift IN_DIR OUT_DIR
import Foundation
import Vision
import CoreImage

let args = CommandLine.arguments
let inDir = URL(fileURLWithPath: args[1]), outDir = URL(fileURLWithPath: args[2])
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
let files = try FileManager.default.contentsOfDirectory(atPath: inDir.path).filter { $0.hasSuffix(".png") }.sorted()
let ctx = CIContext()
let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
var missed = 0
for f in files {
  guard let ci = CIImage(contentsOf: inDir.appendingPathComponent(f)) else { continue }
  let handler = VNImageRequestHandler(ciImage: ci)
  let req = VNGenerateForegroundInstanceMaskRequest()
  try handler.perform([req])
  let out = outDir.appendingPathComponent(f)
  if let obs = req.results?.first {
    let buf = try obs.generateMaskedImage(ofInstances: obs.allInstances, from: handler, croppedToInstancesExtent: false)
    try ctx.writePNGRepresentation(of: CIImage(cvPixelBuffer: buf), to: out, format: .RGBA8, colorSpace: srgb)
  } else {
    missed += 1 // no subject found: write a fully transparent frame of the same size
    let clear = CIImage(color: .clear).cropped(to: ci.extent)
    try ctx.writePNGRepresentation(of: clear, to: out, format: .RGBA8, colorSpace: srgb)
  }
}
print("lifted \(files.count) frames, \(missed) without a subject")
