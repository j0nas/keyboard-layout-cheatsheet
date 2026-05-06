import { canonicalKeyName, partitionBindingTokens } from "./keys";
import type {
	App,
	Binding,
	Layout,
	Modifier,
	TranslatedBinding,
	TranslatedKeypress,
} from "./types";

/**
 * Translate one binding for a given layout, using the app's interpretation
 * model. positional = look up the named key by position, then ask the layout
 * what the user sees on that physical key. symbolic = take the produced
 * character, then ask the layout what (key, modifiers) produce it.
 */
export function translateBinding(
	binding: Binding,
	app: App,
	layout: Layout,
): TranslatedBinding {
	if (app.interpretationModel === "positional") {
		return translatePositional(binding, layout);
	}
	return translateSymbolic(binding, layout);
}

function translatePositional(
	binding: Binding,
	layout: Layout,
): TranslatedBinding {
	const { modifiers, keyTokens } = partitionBindingTokens(binding.keys);
	if (keyTokens.length !== 1) {
		return {
			original: binding,
			keypress: emptyKeypress(),
			warning: `Expected exactly one non-modifier key, got ${keyTokens.length}`,
		};
	}
	const canonical = canonicalKeyName(keyTokens[0]);
	if (!canonical) {
		return {
			original: binding,
			keypress: emptyKeypress(),
			warning: `Unknown key: ${keyTokens[0]}`,
		};
	}
	const chars = layout.keymap[canonical];
	if (!chars) {
		return {
			original: binding,
			keypress: { keyName: canonical, keyLabel: canonical, modifiers },
			warning: `Layout has no entry for ${canonical}`,
		};
	}
	const keyLabel = chars.base ?? chars.shift ?? canonical;
	return {
		original: binding,
		keypress: { keyName: canonical, keyLabel, modifiers },
	};
}

function translateSymbolic(
	binding: Binding,
	layout: Layout,
): TranslatedBinding {
	const { modifiers, keyTokens } = partitionBindingTokens(binding.keys);
	if (keyTokens.length !== 1) {
		return {
			original: binding,
			keypress: emptyKeypress(),
			warning: `Expected exactly one non-modifier key, got ${keyTokens.length}`,
		};
	}
	const targetChar = symbolicTargetChar(keyTokens[0]);
	if (!targetChar) {
		return {
			original: binding,
			keypress: emptyKeypress(),
			warning: `Unknown symbolic key: ${keyTokens[0]}`,
		};
	}
	const found = findCharInLayout(layout, targetChar);
	if (!found) {
		return {
			original: binding,
			keypress: emptyKeypress(),
			warning: `Layout cannot produce '${targetChar}'`,
		};
	}
	return {
		original: binding,
		keypress: {
			keyName: found.keyName,
			keyLabel: found.keyLabel,
			modifiers: mergeShift(modifiers, found.shift),
		},
	};
}

/**
 * For symbolic-mode bindings the binding token IS the character: "/" for slash,
 * "," for comma. We accept both the literal char and the named alias.
 */
function symbolicTargetChar(token: string): string | null {
	if (token.length === 1) return token;
	const canonical = canonicalKeyName(token);
	if (!canonical) return null;
	if (/^[A-Z]$/.test(canonical)) return canonical.toLowerCase();
	if (/^[0-9]$/.test(canonical)) return canonical;
	const aliasToChar: Record<string, string> = {
		Slash: "/",
		Comma: ",",
		Period: ".",
		Minus: "-",
		Equal: "=",
		Semicolon: ";",
		Quote: "'",
		LeftBracket: "[",
		RightBracket: "]",
		Backslash: "\\",
		Grave: "`",
	};
	return aliasToChar[canonical] ?? null;
}

function findCharInLayout(
	layout: Layout,
	target: string,
): { keyName: string; keyLabel: string; shift: boolean } | null {
	for (const [keyName, chars] of Object.entries(layout.keymap)) {
		if (chars.base === target)
			return { keyName, keyLabel: chars.base, shift: false };
		if (chars.shift === target)
			return {
				keyName,
				keyLabel: chars.base ?? chars.shift ?? keyName,
				shift: true,
			};
	}
	return null;
}

function mergeShift(modifiers: Modifier[], addShift: boolean): Modifier[] {
	if (!addShift || modifiers.includes("shift")) return modifiers;
	return [...modifiers, "shift"];
}

function emptyKeypress(): TranslatedKeypress {
	return { keyName: "", keyLabel: "", modifiers: [] };
}

export function translateApp(app: App, layout: Layout): TranslatedBinding[] {
	return app.bindings.map((b) => translateBinding(b, app, layout));
}
