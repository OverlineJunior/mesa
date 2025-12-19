import { Phase, Scheduler } from '@rbxts/planck'
import { RunService } from '@rbxts/services'
import { System, ResolvedSystem } from './system'
import { Plugin, PluginRegistry, ResolvedPlugin } from './plugin'
import { stdPlugins } from './stdPlugins'
import {
	ABSOLUTE_FIRST,
	ABSOLUTE_LAST,
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
 * The starting point of a Toucan application.
 *
 * It stores and exposes operations on _systems_, _plugins_ and _phases_, allowing
 * you to manipulate your _entities_ and _components_ in an organized manner.
 *
 * # Example
 *
 * ```ts
 * const Person = component()
 * const Name = component<string>()
 *
 * function spawnPeople() {
 * 	entity().set(Person).set(Name, 'Alice')
 *     entity().set(Person).set(Name, 'Bob')
 * }
 *
 * function greet() {
 *     query(Name).forEach((_, name) => {
 *         print(`Hello, ${name}!`)
 *     })
 * }
 *
 * const app = new App()
 *     .addSystems(STARTUP, spawnPeople)
 *     .addSystems(UPDATE, greet)
 *     .run()
 * ```
 */
export class App {
	/**
	 * Maps each _system_ to its last recorded delta time (in seconds).
	 *
	 * ⚠️ Only populated if debug mode is enabled with `app.setDebug(true)`.
	 */
	readonly systemDeltaTimes: Map<ResolvedSystem, number> = new Map()
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
	 * function updateHealth() { }
	 * function logPositions() { }
	 *
	 * app.addSystems(UPDATE, updateHealth, logPositions)
	 * ```
	 */
	addSystems<P extends Plugin>(phase: Phase, ...systems: System<P>[]): this {
		const plugin = this.findPluginInCallStack()

		systems.forEach((system) => {
			const resolvedSystem = new ResolvedSystem(system, phase)

			let wrappedSystem = () => resolvedSystem.fn(this, plugin as unknown as P)

			if (this.debugMode) {
				const original = wrappedSystem

				wrappedSystem = () => {
					debug.profilebegin(`System ${resolvedSystem.name}`)
					const t = os.clock()

					original()

					const dt = os.clock() - t
					debug.profileend()
					this.systemDeltaTimes.set(resolvedSystem as ResolvedSystem<Plugin>, dt)
				}
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
						`Toucan cannot determine which one to use.\n\nPlease resolve this conflict by adding ` +
						`'${resolvedPlugin.name}' manually to your app with the desired parameters.`,
				)
			}
		})

		return this
	}

	// TODO! `addPhaseAfter` and `addPhaseBefore` and still unstable.
	// ! We need to check whether bad usage of it breaks the standard that allows for third-party plugins.
	/**
	 * Adds a new _phase_ to be ran after another (except for `LAST` and `ABSOLUTE_LAST`).
	 */
	addPhaseAfter(phase: Phase, after: Phase): this {
		// Reason: maintains the meaning of "first" and "last" phases, while also making
		// sure `internalPhases.{absoluteFirst, absoluteLast}` remain at the absolute ends.
		if (after === LAST || after === ABSOLUTE_LAST) {
			error("Inserting phases after 'LAST' or 'ABSOLUTE_LAST' is not allowed.")
		}

		this.scheduler.insertAfter(phase, after)
		return this
	}

	/**
	 * Adds a new _phase_ to be ran before another (except for `FIRST` and `ABSOLUTE_FIRST`).
	 */
	addPhaseBefore(phase: Phase, before: Phase): this {
		// Reason: same as in `addPhaseAfter`.
		if (before === FIRST || before === ABSOLUTE_FIRST) {
			error("Inserting phases before 'FIRST' or 'ABSOLUTE_FIRST' is not allowed.")
		}

		this.scheduler.insertBefore(phase, before)
		return this
	}

	/**
	 * Enables or disables debug mode, which logs some framework actions and profiles
	 * each _system_ on every run, storing their delta times in `app.systemDeltaTimes`.
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

		warn(`[Toucan Debug] ${message}`)
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
