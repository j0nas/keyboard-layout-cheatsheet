import { useEffect, useMemo, useState } from "react";
import { translateApp } from "../lib/translate";
import type { App, Layout, Modifier, PhysicalLayout } from "../lib/types";
import Keyboard from "./Keyboard";

type Props = {
	apps: App[];
	layouts: Layout[];
	defaultAppId: string;
	defaultLayoutId: string;
};

const MODIFIER_LABEL: Record<Modifier, string> = {
	cmd: "⌘",
	ctrl: "⌃",
	alt: "⌥",
	shift: "⇧",
};

const MODIFIER_ORDER: Modifier[] = ["ctrl", "alt", "shift", "cmd"];

const CHASSIS_STORAGE_KEY = "klc:chassisOverride";

function formatModifiers(mods: Modifier[]): string {
	return MODIFIER_ORDER.filter((m) => mods.includes(m))
		.map((m) => MODIFIER_LABEL[m])
		.join(" ");
}

export default function Cheatsheet({
	apps,
	layouts,
	defaultAppId,
	defaultLayoutId,
}: Props) {
	const [appId, setAppId] = useState(defaultAppId);
	const [layoutId, setLayoutId] = useState(defaultLayoutId);
	const [filter, setFilter] = useState("");
	const [hoveredKeyName, setHoveredKeyName] = useState<string | undefined>();
	const [chassisOverride, setChassisOverride] = useState<
		PhysicalLayout | "auto"
	>("auto");

	// Load chassis preference from localStorage on mount.
	useEffect(() => {
		try {
			const saved = window.localStorage.getItem(CHASSIS_STORAGE_KEY);
			if (saved === "ansi" || saved === "iso" || saved === "auto") {
				setChassisOverride(saved);
			}
		} catch {
			// localStorage may be unavailable (Safari private mode etc.) — ignore.
		}
	}, []);

	useEffect(() => {
		try {
			window.localStorage.setItem(CHASSIS_STORAGE_KEY, chassisOverride);
		} catch {
			// ignore
		}
	}, [chassisOverride]);

	const app = apps.find((a) => a.id === appId) ?? apps[0];
	const layout = layouts.find((l) => l.id === layoutId) ?? layouts[0];

	// Reflect (app, layout) state in URL + document title so the page is
	// shareable and stays in sync as the user pokes around. replaceState
	// avoids polluting history; /app/[appId]/[layoutId]/ are pre-rendered
	// so the URLs are valid direct entry points.
	useEffect(() => {
		const target = `/app/${appId}/${layoutId}/`;
		if (window.location.pathname !== target) {
			window.history.replaceState(null, "", target);
		}
		document.title = `${app.name} on ${layout.name} — Keyboard Layout Cheatsheet`;
	}, [appId, layoutId, app.name, layout.name]);

	const effectiveLayout: Layout =
		chassisOverride === "auto"
			? layout
			: { ...layout, physicalLayout: chassisOverride };

	const translated = useMemo(() => translateApp(app, layout), [app, layout]);

	const filtered = useMemo(() => {
		const q = filter.trim().toLowerCase();
		if (!q) return translated;
		return translated.filter((t) => {
			const text = [
				t.original.action,
				t.original.category ?? "",
				t.keypress.keyLabel,
				t.keypress.modifiers.join(" "),
			]
				.join(" ")
				.toLowerCase();
			return text.includes(q);
		});
	}, [translated, filter]);

	const grouped = useMemo(() => {
		const m = new Map<string, typeof translated>();
		for (const t of filtered) {
			const cat = t.original.category ?? "Other";
			const list = m.get(cat) ?? [];
			list.push(t);
			m.set(cat, list);
		}
		return [...m.entries()];
	}, [filtered]);

	return (
		<div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 text-zinc-100">
			<header className="flex flex-col gap-2">
				<h1 className="font-bold text-2xl">Keyboard Layout Cheatsheet</h1>
				<p className="text-sm text-zinc-400">
					Default keybindings, translated to the keys actually in front of you.
				</p>
			</header>

			<div className="flex flex-wrap items-end gap-4">
				<label className="flex flex-col gap-1 text-sm">
					<span className="text-zinc-400">App</span>
					<select
						className="min-w-44 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
						value={appId}
						onChange={(e) => setAppId(e.target.value)}
					>
						{apps.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name} ({a.interpretationModel})
							</option>
						))}
					</select>
				</label>
				<label className="flex flex-col gap-1 text-sm">
					<span className="text-zinc-400">
						Keyboard layout ({layouts.length} available)
					</span>
					<select
						className="min-w-72 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
						value={layoutId}
						onChange={(e) => setLayoutId(e.target.value)}
					>
						{layouts.map((l) => (
							<option key={l.id} value={l.id}>
								{l.name}
							</option>
						))}
					</select>
				</label>
				<div className="flex flex-col gap-1 text-sm">
					<span className="text-zinc-400">Chassis</span>
					<div className="flex overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 text-xs">
						{(["auto", "ansi", "iso"] as const).map((opt) => (
							<button
								key={opt}
								type="button"
								aria-pressed={chassisOverride === opt}
								onClick={() => setChassisOverride(opt)}
								className={
									chassisOverride === opt
										? "bg-violet-500/30 px-3 py-2 font-semibold text-white"
										: "px-3 py-2 text-zinc-400 hover:text-zinc-200"
								}
							>
								{opt === "auto"
									? `auto (${layout.physicalLayout})`
									: opt.toUpperCase()}
							</button>
						))}
					</div>
				</div>
				<label className="ml-auto flex flex-col gap-1 text-sm">
					<span className="text-zinc-400">Filter bindings</span>
					<input
						type="search"
						placeholder="action, key, modifier..."
						className="min-w-56 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2"
						value={filter}
						onChange={(e) => setFilter(e.target.value)}
					/>
				</label>
			</div>

			<Keyboard
				layout={effectiveLayout}
				translated={translated}
				highlightedKeyName={hoveredKeyName}
			/>

			{grouped.length === 0 ? (
				<div className="rounded-md border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400 text-sm">
					No bindings match "{filter}".
				</div>
			) : (
				<div className="flex flex-col gap-6">
					{grouped.map(([category, items]) => (
						<section key={category} className="flex flex-col gap-2">
							<h2 className="font-semibold text-lg text-zinc-300">
								{category}
							</h2>
							<table className="w-full border-collapse text-sm">
								<tbody>
									{items.map((t, i) => (
										<tr
											// biome-ignore lint/suspicious/noArrayIndexKey: stable order
											key={i}
											className="cursor-default border-zinc-800 border-b transition-colors last:border-0 hover:bg-zinc-900/60"
											onMouseEnter={() =>
												setHoveredKeyName(t.keypress.keyName || undefined)
											}
											onMouseLeave={() => setHoveredKeyName(undefined)}
										>
											<td className="w-44 py-2 pr-4 font-mono">
												<span className="text-violet-300">
													{formatModifiers(t.keypress.modifiers)}
												</span>{" "}
												<span className="text-white">
													{t.keypress.keyLabel}
												</span>
												{t.warning && (
													<span className="ml-2 text-amber-400 text-xs">
														({t.warning})
													</span>
												)}
											</td>
											<td className="py-2 text-zinc-300">
												{t.original.action}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</section>
					))}
				</div>
			)}

			<footer className="border-zinc-800 border-t pt-4 text-xs text-zinc-500">
				{app.name} ({app.interpretationModel}) on {layout.name} —{" "}
				{translated.length} default bindings, {filtered.length} shown.
			</footer>
		</div>
	);
}
