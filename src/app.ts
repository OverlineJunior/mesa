import { Entity, Id, InferComponent, StatefulHook, StatelessHook, world, World } from '@rbxts/jecs'
import { Phase, Scheduler } from '@rbxts/planck'
import { stdPhases, stdPipelines } from './stdPhases'
import { RunService } from '@rbxts/services'
import { findSystems, System } from './system'
import { findPlugins, Plugin } from './plugin'
import { stdPlugins } from './stdPlugins'

export type SystemDeltaTimes = Map<System, number>

export class App {
	readonly systemDeltaTimes: SystemDeltaTimes = new Map()
	private world: World = world()
	private scheduler: Scheduler<[App]> = new Scheduler(this)
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
	 * Automatically adds systems and plugins found within the given source Instances.
	 *
	 * In order for systems and plugins to be found, they must be properly created and
	 * exported as default from ModuleScripts within the given sources.
	 *
	 * @param sources The source Instances to search for systems and plugins.
	 * @returns The app instance for chaining.
	 * @example
	 * ```ts
	 * // ReplicatedStorage/health/updateHealth.ts
	 * export default system(updateHealth, stdPhases.update)
	 *
	 * // ReplicatedStorage/movement/movementPlugin.ts
	 * export default plugin(buildMovementPlugin)
	 *
	 * // main.ts
	 * const app = new App().addSources(ReplicatedStorage)
	 * ```
	 */
	addSources(...sources: Instance[]): this {
		this.addSystems(...findSystems(sources))
		this.addPlugins(...findPlugins(sources))
		return this
	}

	/**
	 * Adds systems to the app, which start running on their respective phases after `app.start()`.
	 * @param systems The systems to add.
	 * @returns The app instance for chaining.
	 */
	addSystems(...systems: System[]): this {
		systems.forEach((system) => {
			const wrappedFn = (app: App) => {
				debug.profilebegin(`System ${system.name}`)
				const t = os.clock()
				system.fn(app)
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
	start(): this {
		// Must run before we run the scheduler to ensure plugins can add systems beforehand.
		this.plugins.forEach((plugin) => {
			plugin.build(this)
		})

		this.scheduler.runAll()

		return this
	}

	/**
	 * Spawns a new, empty entity and returns it.
	 */
	spawn(): Entity

	/**
	 * Spawns a new entity with a single component and value, and returns it.
	 *
	 * Example:
	 * ```ts
	 * const entity = app.spawn(Name, 'Bob')
	 * ```
	 */
	spawn<V>(component: Entity<V>, value: V): Entity

	/**
	 * Spawns a new entity with multiple components and values, and returns it.
	 *
	 * Example:
	 * ```ts
	 * const entity = app.spawn(
	 *     [Health, 100],
	 *     [Position, new Vector3(0, 10, 0)],
	 *     [Velocity, new Vector3(1, 0, 0)],
	 * )
	 * ```
	 */
	spawn<const Pairs extends [Entity<unknown>, unknown][]>(
		...components: {
			[I in keyof Pairs]: Pairs[I] extends [infer E, infer V]
				? E extends Entity<infer T>
					? V extends T
						? [E, V]
						: never
					: never
				: never
		}
	): Entity

	spawn(...args: defined[]): Entity {
		const entity = this.world.entity()

		if (args.size() === 2) {
			const [component, value] = args as [Entity<unknown>, unknown]
			this.set(entity, component, value)
		} else {
			args.forEach((pair) => {
				const [component, value] = pair as [Entity<unknown>, unknown]
				this.set(entity, component, value)
			})
		}

		return entity
	}

	// -------------------------------------------------------------------------
	// World re-exports.
	// -------------------------------------------------------------------------

	// For some unknown reason, when re-exporting as methods, something like
	// `query: World['query'] = (...args) => this.world.query(...args)`
	// causes completely different results. We use this workaround in other places.
	/**
	 * Searches the world for entities that match specified components.
	 *
	 * Example:
	 * ```ts
	 * for (const [entity, position, velocity] of app.query(Position, Velocity)) {
	 *     // ...
	 * }
	 */
	query = ((...args: Id[]) => this.world.query(...args)) as World['query']

	/**
	 * Retrieves the values of up to 4 components on a given entity. Missing
	 * components will return `undefined`.
	 *
	 * Example:
	 * ```ts
	 * const [position, velocity] = app.get(entity, Position, Velocity)
	 * ```
	 */
	get = ((e: Entity, ...args: [Id]) => this.world.get(e, ...args)) as World['get']

	/**
	 * Returns `true` if the given entity has all of the specified components.
	 * A maximum of 4 components can be checked at once.
	 *
	 * Example:
	 * ```ts
	 * if (app.has(entity, Position, Velocity)) {
	 *     // ...
	 * }
	 * ```
	 */
	has = ((...args) => this.world.has(...args)) as World['has']

	/**
	 * Adds a component (with no value) to the entity.
	 *
	 * Example:
	 * ```ts
	 * app.add(entity, IsAlive)
	 * ```
	 */
	add = ((...args) => this.world.add(...args)) as World['add']

	/**
	 * Installs a hook on the given component.
	 * @param component The target component.
	 * @param hook The hook to install.
	 * @param value The hook callback.
	 */
	set<T>(component: Entity<T>, hook: StatefulHook, value: (e: Entity<T>, id: Id<T>, data: T) => void): void
	set<T>(component: Entity<T>, hook: StatelessHook, value: (e: Entity<T>, id: Id<T>) => void): void
	/**
	 * Assigns a value to a component on the given entity.
	 *
	 * Example:
	 * ```ts
	 * app.set(entity, Health, 100)
	 * ```
	 *
	 * Additionally, one can also set pairs:
	 * ```ts
	 * app.set(bob, pair(ChildOf, alice))
	 * ```
	 */
	set<E extends Id<unknown>>(entity: Entity, component: E, value: InferComponent<E>): void
	set(entity: any, component: any, value: any): void {
		return this.world.set(entity, component, value)
	}

	/**
	 * Gets the target of a relationship.
	 * @param entity The entity using a relationship pair.
	 * @param relation The "relationship" component/tag (e.g., ChildOf).
	 * @param index If multiple targets exist, specify an index. Defaults to 0.
	 *
	 * Example:
	 * ```ts
	 * const parent = app.target(child, ChildOf) // Get the parent of `child`.
	 * ```
	 */
	target = ((...args) => this.world.target(...args)) as World['target']

	/**
	 * Gets the parent (the target of a `ChildOf` relationship) for an entity,
	 * if such a relationship exists.
	 *
	 * Example:
	 * ```ts
	 * const parent = app.parent(child)
	 * ```
	 */
	parent = ((...args) => this.world.parent(...args)) as World['parent']

	/**
	 * Checks if an entity exists in the this.world.
	 */
	contains = ((...args) => this.world.contains(...args)) as World['contains']

	/**
	 * Removes a component from the given entity.
	 */
	remove = ((...args) => this.world.remove(...args)) as World['remove']

	/**
	 * Deletes an entity (and its components/relationships) from the world entirely.
	 */
	delete = ((...args) => this.world.delete(...args)) as World['delete']

	/**
	 * Clears all components and relationships from the given entity, but
	 * does not delete the entity from the this.world.
	 */
	clear = ((...args) => this.world.clear(...args)) as World['clear']

	/**
	 * Returns an iterator that yields all entities that have the specified component or relationship.
	 *
	 * Example:
	 * ```ts
	 * for (const entity of app.each(Health)) {
	 *     // ...
	 * }
	 * ```
	 */
	each = ((...args) => this.world.each(...args)) as World['each']

	/**
	 * Returns an iterator that yields all child entities of the specified parent entity.
	 * Uses the ChildOf relationship internally.
	 *
	 * Example:
	 * ```ts
	 * for (const child of app.children(parent)) {
	 *     // ...
	 * }
	 * ```
	 */
	children = ((...args) => this.world.children(...args)) as World['children']

	/**
	 * Enforces a check for entities to be created within a desired range.
	 *
	 * Example:
	 * ```ts
	 * app.range(0, 100) // Only allow entity IDs between 0 and 100.
	 * ```
	 */
	range = ((...args) => this.world.range(...args)) as World['range']
}
