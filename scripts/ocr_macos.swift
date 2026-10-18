// Reads the text in images with macOS Vision, for scripts/check_site.py on a Mac without tesseract.
// Usage: swift scripts/ocr_macos.swift image1.jpg image2.png ...
// Prints, for each image, a line "=== <path>" followed by the text it found.
import AppKit
import Vision

for path in CommandLine.arguments.dropFirst() {
    print("=== \(path)")
    guard let image = NSImage(contentsOfFile: path),
          let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([request])
    for observation in request.results ?? [] {
        if let best = observation.topCandidates(1).first { print(best.string) }
    }
}
