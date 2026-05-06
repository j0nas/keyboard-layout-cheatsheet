import { describe, expect, it } from "vitest";
import aerospace from "../data/apps/aerospace.json" with { type: "json" };
import norwegian from "../data/layouts/norwegian.json" with { type: "json" };
import us from "../data/layouts/us.json" with { type: "json" };
import { translateBinding } from "./translate";
import type { App, Binding, Layout } from "./types";

const aerospaceApp = aerospace as App;
const usAnsi = us as Layout;
const noIso = norwegian as Layout;

const symbolicVim: App = {
	id: "vim",
	name: "Vim",
	interpretationModel: "symbolic",
	bindings: [],
};

function findBinding(action: string): Binding {
	const b = aerospaceApp.bindings.find((x) => x.action === action);
	if (!b) throw new Error(`Test fixture missing: ${action}`);
	return b;
}

describe("positional translation (AeroSpace)", () => {
	it("alt-slash on US ANSI -> Option + / (label '/')", () => {
		const r = translateBinding(
			findBinding("Toggle horizontal/vertical split"),
			aerospaceApp,
			usAnsi,
		);
		expect(r.warning).toBeUndefined();
		expect(r.keypress.keyName).toBe("Slash");
		expect(r.keypress.keyLabel).toBe("/");
		expect(r.keypress.modifiers).toEqual(["alt"]);
	});

	it("alt-slash on Norwegian Mac ISO -> Option + the '-' key", () => {
		const r = translateBinding(
			findBinding("Toggle horizontal/vertical split"),
			aerospaceApp,
			noIso,
		);
		expect(r.warning).toBeUndefined();
		expect(r.keypress.keyName).toBe("Slash");
		expect(r.keypress.keyLabel).toBe("-");
		expect(r.keypress.modifiers).toEqual(["alt"]);
	});

	it("alt-shift-semicolon on Norwegian -> Option+Shift + the 'ø' key", () => {
		const r = translateBinding(
			findBinding("Enter resize mode"),
			aerospaceApp,
			noIso,
		);
		expect(r.warning).toBeUndefined();
		expect(r.keypress.keyName).toBe("Semicolon");
		expect(r.keypress.keyLabel).toBe("ø");
		expect(r.keypress.modifiers).toEqual(["alt", "shift"]);
	});

	it("alt-h is positionally identical across layouts", () => {
		const onUs = translateBinding(
			findBinding("Focus left"),
			aerospaceApp,
			usAnsi,
		);
		const onNo = translateBinding(
			findBinding("Focus left"),
			aerospaceApp,
			noIso,
		);
		expect(onUs.keypress.keyLabel).toBe("h");
		expect(onNo.keypress.keyLabel).toBe("h");
	});
});

describe("symbolic translation (Vim-like)", () => {
	it("ctrl-/ on US ANSI -> Ctrl + the '/' key, no shift", () => {
		const r = translateBinding(
			{ keys: ["ctrl", "slash"], action: "Comment line" },
			symbolicVim,
			usAnsi,
		);
		expect(r.warning).toBeUndefined();
		expect(r.keypress.keyLabel).toBe("/");
		expect(r.keypress.modifiers).toEqual(["ctrl"]);
	});

	it("ctrl-/ on Norwegian Mac ISO -> Ctrl + Shift + 7 (because '/' = Shift+7)", () => {
		const r = translateBinding(
			{ keys: ["ctrl", "slash"], action: "Comment line" },
			symbolicVim,
			noIso,
		);
		expect(r.warning).toBeUndefined();
		expect(r.keypress.keyName).toBe("7");
		expect(r.keypress.keyLabel).toBe("7");
		expect(r.keypress.modifiers).toEqual(["ctrl", "shift"]);
	});

	it("warns when target char isn't producible on the layout", () => {
		const sparseLayout: Layout = {
			id: "sparse",
			name: "Sparse",
			physicalLayout: "ansi",
			keymap: { A: { base: "a" } },
		};
		const r = translateBinding(
			{ keys: ["ctrl", "slash"], action: "x" },
			symbolicVim,
			sparseLayout,
		);
		expect(r.warning).toMatch(/cannot produce/);
	});
});
