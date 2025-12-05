import { Phase, Scheduler } from '@rbxts/planck'
import { RunService } from '@rbxts/services'
import { System, ResolvedSystem } from './system'
import { Plugin, PluginRegistry, ResolvedPlugin } from './plugin'
import { stdPlugins } from './stdPlugins'
import { World } from './world'
import {
	FIRST,
	LAST,
	POST_SIMULATION,
	PRE_ANIMATION,
	PRE_RENDER,
	PRE_SIMULATION,
	STARTUP_PIPELINE,
	UPDATE_PIPELINE,
} from './stdPhases'

/**
 * Stores and exposes operations on _systems_, _plugins_ and _phases_.
 *
 * # Example
 *
 * ```ts
 * const app = new App()
 *     .addSystems(UPDATE, updateStamina, logPositions)
 *     .addPlugins(movementPlugin)
 *     .run()
 * ```
 */
export class App {
	readonly systemDeltaTimes: Map<ResolvedSystem, number> = new Map()
	private world: World = new World()
	private scheduler: Scheduler<[]> = new Scheduler()
	private plugins: PluginRegistry = new PluginRegistry()
	private running = false
	private debugMode = false

	constructor() {
		// Set up standard pipelines and phases.
		this.scheduler
			.insert(STARTUP_PIPELINE)
			.insert(UPDATE_PIPELINE, RunService, 'Heartbeat')
			.insert(PRE_RENDER, RunService, 'PreRender')
			.insert(PRE_ANIMATION, RunService, 'PreAnimation')
			.insert(PRE_SIMULATION, RunService, 'PreSimulation')
			.insert(POST_SIMULATION, RunService, 'PostSimulation')

		this.addPlugins(...stdPlugins)
	}

	/**
	 * Adds _systems_ to the app on a specified _phase_. They're ran automatically on `app.run()`.
	 *
	 * # Example
	 *
	 * ```ts
	 * function updateHealth(world: World) { }
	 * function logPositions(world: World) { }
	 *
	 * app.addSystems(UPDATE, updateHealth, logPositions)
	 * ```
	 */
	addSystems(phase: Phase, ...systems: System[]): this {
		const plugin = this.findPluginInCallStack()

		systems.forEach((system) => {
			const resolvedSystem = new ResolvedSystem(system, phase)

			const wrappedSystem = () => {
				debug.profilebegin(`System ${resolvedSystem.name}`)
				const t = os.clock()

				resolvedSystem.fn({
					world: this.world,
					app: this,
					plugin,
				})

				const dt = os.clock() - t
				debug.profileend()
				this.systemDeltaTimes.set(resolvedSystem, dt)
			}

			this.scheduler.addSystem(wrappedSystem, resolvedSystem.phase)
		})

		return this
	}

	/**
	 * Adds _plugins_ to the app, which are built on `app.run()`, or immediately if the app is already running.
	 *
	 * Duplicate plugins are ignored.
	 *
	 * # Example
	 *
	 * ```ts
	 * class MovementPlugin implements Plugin {
	 *     build(app: App): void { }
	 * }
	 *
	 * app.addPlugins(new MovementPlugin())
	 * ```
	 */
	addPlugins(...plugins: Plugin[]): this {
		const callerScriptPath = debug.info(2, 's')[0]
		const isThirdParty = callerScriptPath.match('node_modules')[0] !== undefined

		plugins.forEach((plugin) => {
			const [resolvedPlugin, err] = this.plugins.add(plugin, isThirdParty ? 'third-party' : 'user')

			if (!err && this.running) {
				// If the app is already running, we build the plugin immediately.
				this.plugins.build(resolvedPlugin, this)
			} else if (err === 'duplicatePlugin') {
				this.tryDebug(`Plugin '${resolvedPlugin.name}' was already added; skipping duplicate.`)
			} else if (err === 'duplicateThirdPartyPlugin') {
				error(
					`Two third-party plugins attempted to add the same plugin '${resolvedPlugin.name}'. ` +
						`Because of this and the fact that '${resolvedPlugin.name}' has constructor parameters, ` +
						`Mesa cannot determine which one to use.\n\nPlease resolve this conflict by adding ` +
						`'${resolvedPlugin.name}' manually to your app with the desired parameters.`,
				)
			}
		})

		return this
	}

	// TODO! `addPhaseAfter` and `addPhaseBefore` and still unstable.
	// ! We need to check whether bad usage of it breaks the standard that allows for third-party plugins.
	/**
	 * Adds a new _phase_ to be ran after another (except for `LAST`).
	 */
	addPhaseAfter(phase: Phase, after: Phase): this {
		// Reason: maintains the meaning of "first" and "last" phases, while also making
		// sure `internalPhases.{absoluteFirst, absoluteLast}` remain at the absolute ends.
		if (after === LAST) {
			error('Inserting phases after `LAST` is not allowed.')
		}

		this.scheduler.insertAfter(phase, after)
		return this
	}

	/**
	 * Adds a new _phase_ to be ran before another (except for `FIRST`).
	 */
	addPhaseBefore(phase: Phase, before: Phase): this {
		// Reason: same as in `addPhaseAfter`.
		if (before === FIRST) {
			error('Inserting phases before `FIRST` is not allowed.')
		}

		this.scheduler.insertBefore(phase, before)
		return this
	}

	/**
	 * Enables or disables debug mode.
	 */
	setDebug(enabled: boolean): this {
		this.debugMode = enabled
		return this
	}

	/**
	 * Builds all added _plugins_ and starts the app's scheduler, running all
	 * _systems_ on their respective phases.
	 */
	run(): this {
		// Must run before we run the scheduler to ensure plugins can add systems beforehand.
		this.plugins.buildAll(this)
		this.scheduler.runAll()
		this.running = true
		return this
	}

	private tryDebug(message: string): void {
		if (!this.debugMode) return

		warn(`[Mesa Debug] ${message}`)
	}

	private findPluginInCallStack(): ResolvedPlugin | undefined {
		function hasBuildInCallStack(build: Callback): boolean {
			let depth = 2

			while (true) {
				const f = debug.info(depth, 'f')[0]
				if (f === undefined) {
					return false
				} else if (f === build) {
					return true
				}
				depth++
			}
		}

		let plugin: ResolvedPlugin | undefined = undefined

		this.plugins.getAll().forEach((p) => {
			const hasBuild = hasBuildInCallStack(p.buildFn)
			if (hasBuild) {
				plugin = p
				return
			}
		})

		return plugin
	}
}
