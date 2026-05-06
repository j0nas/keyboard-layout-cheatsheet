/**
 * Modifier states the keymap distinguishes. base = no modifiers held.
 * AltGr exists on European Windows/Linux; Mac uses option, mapped here as alt.
 */
export type ModifierState = "base" | "shift" | "alt" | "altShift";

export type KeyChars = Partial<Record<ModifierState, string>>;

/**
 * Physical chassis. ISO has the extra key between left-shift and Z (sectionSign
 * on Mac), and a different return key shape. ANSI does not.
 */
export type PhysicalLayout = "ansi" | "iso";

export type Layout = {
	id: string;
	name: string;
	physicalLayout: PhysicalLayout;
	/**
	 * Map from canonical key name (e.g. "Slash", "Section", "A") to characters
	 * produced under each modifier state. Names are positional: "Slash" is the
	 * physical key at the US-ANSI / position regardless of what it produces.
	 */
	keymap: Record<string, KeyChars>;
};

export type Modifier = "cmd" | "ctrl" | "alt" | "shift";

export type Binding = {
	keys: string[];
	action: string;
	category?: string;
};

/**
 * positional: app reads virtual key codes; binding's letter-key name refers to
 *   physical position (AeroSpace, i3, sxhkd).
 * symbolic: app reads characters after the OS layout has resolved them; user
 *   must press whatever combo produces that character (Vim's <C-/>, tmux).
 */
export type InterpretationModel = "positional" | "symbolic";

export type App = {
	id: string;
	name: string;
	interpretationModel: InterpretationModel;
	bindings: Binding[];
};

export type TranslatedKeypress = {
	/** The named key the user must press, in their layout. */
	keyName: string;
	/** The label printed on the physical key on this layout, when known. */
	keyLabel: string;
	/** Modifiers the user must hold (may include shift even if the binding didn't). */
	modifiers: Modifier[];
};

export type TranslatedBinding = {
	original: Binding;
	keypress: TranslatedKeypress;
	/** Set when translation can't be resolved cleanly (unknown key, char absent). */
	warning?: string;
};
