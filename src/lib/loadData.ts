import type { App, Layout } from "./types";

const layoutModules = import.meta.glob("../data/layouts/*.json", {
	eager: true,
	import: "default",
}) as Record<string, Layout>;

const appModules = import.meta.glob("../data/apps/*.json", {
	eager: true,
	import: "default",
}) as Record<string, App>;

function sortByName<T extends { name: string }>(arr: T[]): T[] {
	return [...arr].sort((a, b) => a.name.localeCompare(b.name));
}

export const allLayouts: Layout[] = sortByName(Object.values(layoutModules));
export const allApps: App[] = sortByName(Object.values(appModules));

export function findLayout(id: string): Layout | undefined {
	return allLayouts.find((l) => l.id === id);
}

export function findApp(id: string): App | undefined {
	return allApps.find((a) => a.id === id);
}
