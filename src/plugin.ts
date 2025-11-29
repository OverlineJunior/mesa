import { App } from "./app"

export interface Plugin {
	build: (app: App) => void
}

export function plugin(build: (app: App) => void): Plugin {
	return { build }
}

export function isPlugin(thing: unknown): thing is Plugin {
	return typeIs(thing, 'table') && 'build' in thing
}

export function findPlugins(sources: Instance[]): Plugin[] {
	const plugins: Plugin[] = []

	sources.forEach((src) => {
		src.GetDescendants().forEach((mod) => {
			if (!mod.IsA('ModuleScript')) return

			const p = require(mod)
			if (!typeIs(p, 'table')) return

			if ('default' in p && isPlugin(p.default)) {
				plugins.push(p.default)
			}
		})
	})

	return plugins
}
