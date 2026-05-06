import type { Modifier } from "./types";

const MODIFIER_TOKENS = new Set<Modifier>(["cmd", "ctrl", "alt", "shift"]);

/**
 * Canonical key names used by Layout.keymap. Binding tokens map to these
 * via canonicalKeyName().
 */
const NAMED_KEYS: Record<string, string> = {
	slash: "Slash",
	comma: "Comma",
	period: "Period",
	minus: "Minus",
	equal: "Equal",
	semicolon: "Semicolon",
	quote: "Quote",
	leftbracket: "LeftBracket",
	rightbracket: "RightBracket",
	backslash: "Backslash",
	grave: "Grave",
	backtick: "Grave",
	section: "Section",
	sectionsign: "Section",
};

export function isModifier(token: string): token is Modifier {
	return MODIFIER_TOKENS.has(token as Modifier);
}

export function canonicalKeyName(token: string): string | null {
	const lower = token.toLowerCase();
	if (NAMED_KEYS[lower]) return NAMED_KEYS[lower];
	if (/^[a-z]$/.test(lower)) return lower.toUpperCase();
	if (/^[0-9]$/.test(lower)) return lower;
	return null;
}

export function partitionBindingTokens(tokens: string[]): {
	modifiers: Modifier[];
	keyTokens: string[];
} {
	const modifiers: Modifier[] = [];
	const keyTokens: string[] = [];
	for (const t of tokens) {
		const lower = t.toLowerCase();
		if (isModifier(lower)) modifiers.push(lower);
		else keyTokens.push(t);
	}
	return { modifiers, keyTokens };
}
