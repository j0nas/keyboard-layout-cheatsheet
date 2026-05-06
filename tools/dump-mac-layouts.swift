// Dump every installed macOS keyboard layout to JSON in our schema, using
// UCKeyTranslate. Run as: swift tools/dump-mac-layouts.swift [outDir]
//
// Default outDir: src/data/layouts (relative to cwd). One file per layout,
// id derived from kTISPropertyInputSourceID, name from kTISPropertyLocalizedName.

import Carbon
import Foundation

// HIToolbox virtual key codes → canonical names used by Layout.keymap.
// Source: <Carbon/HIToolbox/Events.h>.
let VK_TO_NAME: [Int: String] = [
	0x00: "A", 0x01: "S", 0x02: "D", 0x03: "F", 0x04: "H", 0x05: "G",
	0x06: "Z", 0x07: "X", 0x08: "C", 0x09: "V",
	0x0A: "Section",
	0x0B: "B", 0x0C: "Q", 0x0D: "W", 0x0E: "E", 0x0F: "R",
	0x10: "Y", 0x11: "T",
	0x12: "1", 0x13: "2", 0x14: "3", 0x15: "4", 0x16: "6", 0x17: "5",
	0x18: "Equal", 0x19: "9", 0x1A: "7",
	0x1B: "Minus",
	0x1C: "8", 0x1D: "0",
	0x1E: "RightBracket", 0x1F: "O", 0x20: "U", 0x21: "LeftBracket",
	0x22: "I", 0x23: "P",
	0x25: "L", 0x26: "J", 0x27: "Quote", 0x28: "K", 0x29: "Semicolon",
	0x2A: "Backslash", 0x2B: "Comma", 0x2C: "Slash",
	0x2D: "N", 0x2E: "M", 0x2F: "Period",
	0x32: "Grave",
]

let MODIFIER_STATES: [(name: String, mask: UInt32)] = [
	("base", 0),
	("shift", UInt32(shiftKey >> 8)),
	("alt", UInt32(optionKey >> 8)),
	("altShift", UInt32((shiftKey | optionKey) >> 8)),
]

// Codable-friendly model — encoder skips nil fields automatically when we use
// encodeIfPresent so absent characters don't pollute the JSON.
struct KeyChars: Encodable {
	var base: String?
	var shift: String?
	var alt: String?
	var altShift: String?

	func encode(to encoder: Encoder) throws {
		enum CodingKeys: String, CodingKey { case base, shift, alt, altShift }
		var c = encoder.container(keyedBy: CodingKeys.self)
		try c.encodeIfPresent(base, forKey: .base)
		try c.encodeIfPresent(shift, forKey: .shift)
		try c.encodeIfPresent(alt, forKey: .alt)
		try c.encodeIfPresent(altShift, forKey: .altShift)
	}
}

struct LayoutOutput: Encodable {
	let id: String
	let name: String
	let physicalLayout: String
	let keymap: [String: KeyChars]
}

func translate(_ layout: UnsafePointer<UCKeyboardLayout>, vk: UInt16, mod: UInt32) -> String? {
	var deadKeyState: UInt32 = 0
	var chars = [UniChar](repeating: 0, count: 8)
	var charCount = 0
	let result = UCKeyTranslate(
		layout,
		vk,
		UInt16(kUCKeyActionDown),
		mod,
		UInt32(LMGetKbdType()),
		OptionBits(kUCKeyTranslateNoDeadKeysMask),
		&deadKeyState,
		chars.count,
		&charCount,
		&chars
	)
	guard result == noErr, charCount > 0 else { return nil }
	let s = String(utf16CodeUnits: chars, count: charCount)
	// Filter control chars; UCKeyTranslate returns 0x10 etc. for keys with
	// no printable mapping under that modifier state.
	if s.unicodeScalars.allSatisfy({ $0.value < 0x20 }) { return nil }
	return s
}

// "com.apple.keylayout.Norwegian-Pro" → "norwegian-pro"
func sanitizeId(_ raw: String) -> String {
	let trimmed = raw.replacingOccurrences(of: "com.apple.keylayout.", with: "")
	let lower = trimmed.lowercased()
	let pattern = try! NSRegularExpression(pattern: "[^a-z0-9]+")
	let range = NSRange(lower.startIndex..., in: lower)
	let dashed = pattern.stringByReplacingMatches(
		in: lower, range: range, withTemplate: "-")
	return dashed.trimmingCharacters(in: CharacterSet(charactersIn: "-"))
}

func cfStringProperty(_ source: TISInputSource, _ key: CFString) -> String? {
	guard let ptr = TISGetInputSourceProperty(source, key) else { return nil }
	return Unmanaged<CFString>.fromOpaque(ptr).takeUnretainedValue() as String
}

let outDir = CommandLine.arguments.count > 1
	? CommandLine.arguments[1]
	: "src/data/layouts"

try FileManager.default.createDirectory(
	atPath: outDir, withIntermediateDirectories: true)

// Pass includeAllInstalled=true so we get every system-shipped layout, not
// just the user's currently-enabled input sources.
guard let listPtr = TISCreateInputSourceList(nil, true) else {
	FileHandle.standardError.write("Failed to enumerate input sources\n".data(using: .utf8)!)
	exit(1)
}
let sources = listPtr.takeRetainedValue() as NSArray

var written = 0
var skippedDuplicates = 0
var seenIds = Set<String>()

for case let source as TISInputSource in sources {
	guard let dataPtr = TISGetInputSourceProperty(source, kTISPropertyUnicodeKeyLayoutData) else {
		continue
	}
	let cfData = Unmanaged<CFData>.fromOpaque(dataPtr).takeUnretainedValue()
	let data = cfData as Data

	let name = cfStringProperty(source, kTISPropertyLocalizedName) ?? "Unknown"
	let sourceId = cfStringProperty(source, kTISPropertyInputSourceID) ?? name
	let id = sanitizeId(sourceId)

	if seenIds.contains(id) {
		skippedDuplicates += 1
		continue
	}

	var keymap: [String: KeyChars] = [:]
	data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
		guard let layoutPtr = raw.baseAddress?.assumingMemoryBound(to: UCKeyboardLayout.self) else {
			return
		}
		for (vk, keyName) in VK_TO_NAME {
			var chars = KeyChars()
			for (modName, modMask) in MODIFIER_STATES {
				guard let s = translate(layoutPtr, vk: UInt16(vk), mod: modMask) else { continue }
				switch modName {
				case "base": chars.base = s
				case "shift": chars.shift = s
				case "alt": chars.alt = s
				case "altShift": chars.altShift = s
				default: break
				}
			}
			let any = chars.base ?? chars.shift ?? chars.alt ?? chars.altShift
			if any != nil {
				keymap[keyName] = chars
			}
		}
	}

	if keymap.isEmpty { continue }

	// ISO vs ANSI is a hardware property, not encoded in Apple's layout data.
	// Heuristic: layouts that are typically sold with ANSI hardware (US English
	// family) default to ANSI; everything else defaults to ISO. Users on
	// non-default chassis can override via the UI later.
	let ansiLayoutIds: Set<String> = [
		"us", "abc", "abc-india", "us-international-pc",
		"dvorak", "dvorak-left", "dvorak-right", "dvorakqwertycmd",
		"colemak", "usextended", "australian", "british", "british-pc",
		"canadianenglish",
	]
	let physicalLayout = ansiLayoutIds.contains(id) ? "ansi" : "iso"

	seenIds.insert(id)

	let out = LayoutOutput(
		id: id, name: name, physicalLayout: physicalLayout, keymap: keymap)
	let encoder = JSONEncoder()
	encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
	let bytes = try encoder.encode(out)
	let path = "\(outDir)/\(id).json"
	try bytes.write(to: URL(fileURLWithPath: path))
	written += 1
	print("wrote \(path) — \(name) (\(keymap.count) keys, \(physicalLayout))")
}

print("---")
print("\(written) layouts written to \(outDir)")
if skippedDuplicates > 0 {
	print("\(skippedDuplicates) duplicates skipped")
}
