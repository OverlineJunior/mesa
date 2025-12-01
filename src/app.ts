import { Phase, Scheduler } from '@rbxts/planck'
import { stdPhases, stdPipelines } from './stdPhases'
import { RunService } from '@rbxts/services'
import { System, SystemFn } from './system'
import { Plugin } from './plugin'
import { stdPlugins } from './stdPlugins'
import { World } from './world'

export type SystemDeltaTimes = Map<System, number>

export class App {
	readonly systemDeltaTimes: SystemDeltaTimes = new Map()
	private scheduler: Scheduler<[World]> = new Scheduler(new World())
	private plugins: Plugin[] = []

	/**
	 * Creates a new app, which handles the ECS world and scheduler.
	 * @example
	 * ```ts
	 * const app = new App()
	 *     .addSystems(updateStamina, logPositions)
	 *     .addPlugins(movementPlugin)
	 *     .start()
	 * ```
	 */
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
	 * Adds systems to the app, which start running on their respective phases after `app.start()`.
	 * @param systems The systems to add.
	 * @returns The app instance for chaining.
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
	 * Adds plugins to the app, which are built after `app.start()`.
	 * @param plugins The plugins to add.
	 * @returns The app instance for chaining.
	 */
	addPlugins(...plugins: Plugin[]): this {
		plugins.forEach((plugin) => {
			this.plugins.push(plugin)
		})

		return this
	}

	/**
	 * Adds a new phase after an existing phase in the scheduler.
	 * @param phase The new phase to add.
	 * @param after The existing phase to add after (except for `stdPhases.last`).
	 * @returns The app instance for chaining.
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
	 * Adds a new phase before an existing phase in the scheduler.
	 * @param phase The new phase to add.
	 * @param before The existing phase to add before (except for `stdPhases.first`).
	 * @returns The app instance for chaining.
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
	 * Builds all added plugins and starts the app's scheduler, running all
	 * systems on their respective phases.
	 */
	run(): void {
		// TODO! If we create the world earlier, component declarations fail because
		// ! they must happen before the world is created. This calls for a builder.


		// Must run before we run the scheduler to ensure plugins can add systems beforehand.
		this.plugins.forEach((plugin) => {
			plugin.build(this)
		})

		this.scheduler.runAll()
	}
}
