import type { Layout, TranslatedBinding } from "../lib/types";

type Props = {
	layout: Layout;
	translated: TranslatedBinding[];
	highlightedKeyName?: string;
};

// vk-code naming is US-ANSI-centric. On ISO Mac keyboards, the physical
// "section sign" key (top-left, where § is on European layouts) is vk 0x0A
// (Section), and the ISO extra key between left-shift and Z is vk 0x32 (Grave).
// On ANSI keyboards the top-left is Grave and there's no extra ISO key.
const ROWS_ANSI: string[][] = [
	["Grave", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "Minus", "Equal"],
	[
		"Q",
		"W",
		"E",
		"R",
		"T",
		"Y",
		"U",
		"I",
		"O",
		"P",
		"LeftBracket",
		"RightBracket",
		"Backslash",
	],
	["A", "S", "D", "F", "G", "H", "J", "K", "L", "Semicolon", "Quote"],
	["Z", "X", "C", "V", "B", "N", "M", "Comma", "Period", "Slash"],
];

const ROWS_ISO: string[][] = [
	[
		"Section",
		"1",
		"2",
		"3",
		"4",
		"5",
		"6",
		"7",
		"8",
		"9",
		"0",
		"Minus",
		"Equal",
	],
	[
		"Q",
		"W",
		"E",
		"R",
		"T",
		"Y",
		"U",
		"I",
		"O",
		"P",
		"LeftBracket",
		"RightBracket",
	],
	[
		"A",
		"S",
		"D",
		"F",
		"G",
		"H",
		"J",
		"K",
		"L",
		"Semicolon",
		"Quote",
		"Backslash",
	],
	["Grave", "Z", "X", "C", "V", "B", "N", "M", "Comma", "Period", "Slash"],
];

const ROW_INDENTS = [0, 14, 22, 30];

function isShiftCaseOf(base: string | undefined, shift: string | undefined) {
	if (!base || !shift) return false;
	return base.length === 1 && shift === base.toUpperCase();
}

export default function Keyboard({
	layout,
	translated,
	highlightedKeyName,
}: Props) {
	const rows = layout.physicalLayout === "iso" ? ROWS_ISO : ROWS_ANSI;
	const bindingsByKey = new Map<string, TranslatedBinding[]>();
	for (const t of translated) {
		const k = t.keypress.keyName;
		if (!k) continue;
		const list = bindingsByKey.get(k) ?? [];
		list.push(t);
		bindingsByKey.set(k, list);
	}

	return (
		<div className="overflow-x-auto rounded-lg bg-zinc-900 p-3">
			<div className="flex min-w-max flex-col gap-1">
				{rows.map((row, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: row order is stable
						key={i}
						className="flex gap-1"
						style={{ paddingLeft: `${ROW_INDENTS[i] ?? 0}px` }}
					>
						{row.map((keyName) => {
							const chars = layout.keymap[keyName];
							const base = chars?.base;
							const shift = chars?.shift;
							const alt = chars?.alt;
							const altShift = chars?.altShift;
							const bindings = bindingsByKey.get(keyName) ?? [];
							const isBound = bindings.length > 0;
							const isHighlighted = highlightedKeyName === keyName;
							const showShift = shift && !isShiftCaseOf(base, shift);
							const mainLabel = base ?? shift ?? keyName;

							const borderClass = isHighlighted
								? "border-amber-300 bg-amber-500/20 ring-2 ring-amber-300"
								: isBound
									? "border-violet-400 bg-violet-500/25"
									: "border-zinc-700 bg-zinc-800";

							return (
								<div
									key={keyName}
									className={`relative flex h-16 w-16 flex-col rounded-md border p-1 text-zinc-200 ${borderClass}`}
									title={
										bindings.length > 0
											? bindings.map((b) => b.original.action).join("\n")
											: undefined
									}
								>
									<div className="flex h-1/2 justify-between text-[10px] leading-none">
										<span className="text-zinc-300">
											{showShift ? shift : ""}
										</span>
										<span className="text-violet-300/80">{altShift ?? ""}</span>
									</div>
									<div className="flex h-1/2 items-end justify-between text-[10px] leading-none">
										<span className="font-medium text-base text-white">
											{mainLabel}
										</span>
										<span className="text-violet-300/60">{alt ?? ""}</span>
									</div>
									{isBound && (
										<span className="absolute top-0.5 right-1 rounded bg-violet-500 px-1 text-[9px] font-bold text-white">
											{bindings.length}
										</span>
									)}
								</div>
							);
						})}
					</div>
				))}
			</div>
			<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
				<span>
					<span className="text-white">a</span> base
				</span>
				<span>
					<span className="text-zinc-300">A</span> shift
				</span>
				<span>
					<span className="text-violet-300/60">å</span> alt (option)
				</span>
				<span>
					<span className="text-violet-300/80">Å</span> alt + shift
				</span>
				<span className="ml-auto">
					<span className="rounded bg-violet-500 px-1 text-[9px] font-bold text-white">
						N
					</span>{" "}
					= bindings on this key
				</span>
			</div>
		</div>
	);
}
