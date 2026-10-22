// Lifts the foreground subject(s) out of an image with macOS Vision (the same model as
// "Lift subject" in Photos) and writes a same-size PNG with transparency.
// usage: swift lift.swift IN.png OUT.png [instance indices, e.g. 1,2 — default: all]
import Foundation
import Vision
import CoreImage

let args = CommandLine.arguments
guard args.count >= 3, let ci = CIImage(contentsOf: URL(fileURLWithPath: args[1])) else {
  print("usage: swift lift.swift IN.png OUT.png [instances]"); exit(2)
}
let handler = VNImageRequestHandler(ciImage: ci)
let req = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([req])
guard let obs = req.results?.first else { print("no subject found"); exit(1) }
var chosen = obs.allInstances
if args.count >= 4 { chosen = IndexSet(args[3].split(separator: ",").compactMap { Int($0) }) }
// also write each instance on its own (OUT.instN.png) so the caller can keep the parrot
// apart from nearby bubbles, bulbs or sparkles
for i in obs.allInstances {
  let one = try obs.generateMaskedImage(ofInstances: IndexSet(integer: i), from: handler, croppedToInstancesExtent: false)
  let path = args[2].replacingOccurrences(of: ".png", with: ".inst\(i).png")
  try CIContext().writePNGRepresentation(of: CIImage(cvPixelBuffer: one), to: URL(fileURLWithPath: path), format: .RGBA8,
                                         colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
}
let buf = try obs.generateMaskedImage(ofInstances: chosen, from: handler, croppedToInstancesExtent: false)
let out = CIImage(cvPixelBuffer: buf)
try CIContext().writePNGRepresentation(of: out, to: URL(fileURLWithPath: args[2]), format: .RGBA8,
                                       colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
print("wrote \(args[2]) instances \(Array(chosen))")
