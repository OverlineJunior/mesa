import { App } from './app'

export interface Plugin {
	build(app: App): void
}

export interface ResolvedPlugin extends Plugin {
	constructorFn: Callback
	// Even though build is already defined in Plugin, we redefine it as a function instead
	// of a method because, in Roblox-TS, we cannot refer to methods without calling them.
	buildFn: Callback
	name: string
	owner: 'user' | 'third-party'
	built: boolean
}

export type PluginAddError = 'duplicatePlugin' | 'duplicateThirdPartyPlugin'

export class PluginRegistry {
	plugins: Map<ResolvedPlugin['constructorFn'], ResolvedPlugin> = new Map()

	add(plugin: Plugin, owner: ResolvedPlugin['owner']): [ResolvedPlugin, PluginAddError | undefined] {
		const resolvedPlugin = this.resolve(plugin, owner)

		const existing = this.plugins.get(resolvedPlugin.constructorFn)
		if (existing) {
			const [argNum] = debug.info(resolvedPlugin.constructorFn, 'a')
			// Two of the same third-party plugin with constructor parameters (excluding self)
			// might indicate a conflict that the user needs to resolve manually.
			if (argNum > 1 && existing.owner === 'third-party' && owner === 'third-party') {
				return [resolvedPlugin, 'duplicateThirdPartyPlugin']
			}

			return [resolvedPlugin, 'duplicatePlugin']
		}

		this.plugins.set(resolvedPlugin.constructorFn, resolvedPlugin)

		return [resolvedPlugin, undefined]
	}

	build(plugin: ResolvedPlugin, app: App): void {
		plugin.build(app)
		plugin.built = true
	}

	buildAll(app: App): void {
		let builtCount = 0

		// Because plugins can add more plugins when built, we loop until all are built.
		while (builtCount < this.plugins.size()) {
			const snapshot = [...this.plugins]
			// Sort so that user plugins build before third-party plugins.
			// This is important so that user plugins can override third-party plugins.
			snapshot.sort(([, p1], [, p2]) => {
				if (p1.owner === 'user' && p2.owner === 'third-party') return true
				if (p1.owner === 'third-party' && p2.owner === 'user') return false
				return false
			})

			for (const [_, plugin] of [...this.plugins]) {
				if (plugin.built) continue

				this.build(plugin, app)
				builtCount++
			}
		}
	}

	getAll(): ResolvedPlugin[] {
		return ([...this.plugins]).map(([, plugin]) => plugin)
	}

	getByBuildFn(build: Callback): ResolvedPlugin | undefined {
		for (const [, plugin] of this.plugins) {
			if (plugin.build === build) {
				return plugin
			}
		}

		return undefined
	}

	private resolve(plugin: Plugin, owner: ResolvedPlugin['owner']): ResolvedPlugin {
		const resolved = plugin as ResolvedPlugin
		resolved.constructorFn = (plugin as unknown as { constructor: Callback }).constructor
		resolved.buildFn = plugin.build
		resolved.name = tostring(getmetatable(plugin))
		resolved.owner = owner
		resolved.built = false
		return resolved
	}
}
