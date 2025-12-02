import { Phase, Scheduler } from '@rbxts/planck'
import { stdPhases, stdPipelines } from './stdPhases'
import { RunService } from '@rbxts/services'
import { System, SystemFn } from './system'
import { Plugin } from './plugin'
import { stdPlugins } from './stdPlugins'
import { World } from './world'

export type SystemDeltaTimes = Map<System, number>

/**
 * Stores and exposes operations on _systems_, _plugins_ and _phases_.
 *
 * # Example
 *
 * ```ts
 * const app = new App()
 *     .addSystems(stdPhases.update, updateStamina, logPositions)
 *     .addPlugins(movementPlugin)
 *     .run()
 * ```
 */
export class App {
	readonly systemDeltaTimes: SystemDeltaTimes = new Map()
	private scheduler: Scheduler<[World, App]> = new Scheduler(new World(), this)
	private plugins: Plugin[] = []
	private running = false
	private debugMode = false

	constructor() {
		// Set up standard pipelines and phases.
		this.scheduler
			.insert(stdPipelines.startup)
			.insert(stdPipelines.update, RunService, 'Heartbeat')
			.insert(stdPhases.preRender, RunService, 'PreRender')
			.insert(stdPhases.preAnimation, RunService, 'PreAnimation')
			.insert(stdPhases.preSimulation, RunService, 'PreSimulation')
			.insert(stdPhases.postSimulation, RunService, 'PostSimulation')

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
	 * app.addSystems(stdPhases.update, updateHealth, logPositions)
	 * ```
	 */
	addSystems(phase: Phase, ...systems: SystemFn[]): this {
		systems.forEach((systemFn) => {
			const system = new System(systemFn, phase)
			let fn = system.fn

			if (this.debugMode) {
				fn = (...args: unknown[]) => {
					debug.profilebegin(`System ${system.name}`)
					const t = os.clock()
					system.fn(...args)
					const dt = os.clock() - t
					debug.profileend()
					this.systemDeltaTimes.set(system, dt)
				}
			}

			this.scheduler.addSystem(fn, system.phase)
		})

		return this
	}

	/**
	 * Adds _plugins_ to the app, which are built on `app.run()`.
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
		plugins.forEach((plugin) => {
			// TODO! This needs testing.
			// Since user plugin addition runs first, this check means that if a third-party
			// plugin adds the same plugin the user added, the user's addition takes precedence.
			if (plugins.some((p) => getmetatable(p) === getmetatable(plugin))) {
				this.tryDebug(`Plugin '${getmetatable(plugin)}' was already added; skipping duplicate addition.`)
				return
			}

			this.plugins.push(plugin)

			if (this.running) {
				plugin.build(this)
			}
		})

		return this
	}

	// TODO! `addPhaseAfter` and `addPhaseBefore` and still unstable.
	// ! We need to check whether bad usage of it breaks the standard that allows for third-party plugins.
	/**
	 * Adds a new _phase_ to be ran after another (except for `stdPhases.last`).
	 */
	addPhaseAfter(phase: Phase, after: Phase): this {
		// Reason: maintains the meaning of "first" and "last" phases, while also making
		// sure `internalPhases.{absoluteFirst, absoluteLast}` remain at the absolute ends.
		if (after === stdPhases.last) {
			error('Inserting phases after `stdPhases.last` is not allowed.')
		}

		this.scheduler.insertAfter(phase, after)
		return this
	}

	/**
	 * Adds a new _phase_ to be ran before another (except for `stdPhases.first`).
	 */
	addPhaseBefore(phase: Phase, before: Phase): this {
		// Reason: same as in `addPhaseAfter`.
		if (before === stdPhases.first) {
			error('Inserting phases before `stdPhases.first` is not allowed.')
		}

		this.scheduler.insertBefore(phase, before)
		return this
	}

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
		this.plugins.forEach((plugin) => {
			plugin.build(this)
		})

		this.scheduler.runAll()

		this.running = true

		return this
	}

	private tryDebug(message: string): void {
		if (!this.debugMode) return

		print(`[Mesa Debug] ${message}`)
	}
}
