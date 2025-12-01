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
	private scheduler: Scheduler<[World]> = new Scheduler(new World())
	private plugins: Plugin[] = []

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

			const wrappedFn = (world: World) => {
				debug.profilebegin(`System ${system.name}`)
				const t = os.clock()
				system.fn(world)
				const dt = os.clock() - t
				debug.profileend()
				this.systemDeltaTimes.set(system, dt)
			}

			this.scheduler.addSystem(wrappedFn, system.phase)
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
			this.plugins.push(plugin)
		})

		return this
	}

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

	/**
	 * Builds all added _plugins_ and starts the app's scheduler, running all
	 * _systems_ on their respective phases.
	 */
	run(): void {
		// Must run before we run the scheduler to ensure plugins can add systems beforehand.
		this.plugins.forEach((plugin) => {
			plugin.build(this)
		})

		this.scheduler.runAll()
	}
}
