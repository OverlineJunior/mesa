import { Entity, Id, InferComponent, StatefulHook, StatelessHook, world, World } from '@rbxts/jecs'
import { Phase, Pipeline, Scheduler } from '@rbxts/planck'
import { stdPhases, stdPipelines } from './stdPhases'
import { RunService } from '@rbxts/services'
import { findSystems, System } from './system'
import { findPlugins, Plugin } from './plugin'

export type SystemDeltaTimes = Map<System, number>

export class App {
	world: World = world()
	scheduler: Scheduler<[App]> = new Scheduler(this)
	readonly systemDeltaTimes: SystemDeltaTimes = new Map()

	constructor() {
		// Set up standard pipelines and phases.
		this.scheduler
			.insert(stdPipelines.startup)
			.insert(stdPipelines.update, RunService, 'Heartbeat')
			.insert(stdPhases.preRender, RunService, 'PreRender')
			.insert(stdPhases.preAnimation, RunService, 'PreAnimation')
			.insert(stdPhases.preSimulation, RunService, 'PreSimulation')
			.insert(stdPhases.postSimulation, RunService, 'PostSimulation')
	}

	addSources(...sources: Instance[]): this {
		this.addSystems(...findSystems(sources))
		this.addPlugins(...findPlugins(sources))
		return this
	}

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

	addPlugins(...plugins: Plugin[]): this {
		plugins.forEach((plugin) => {
			plugin.build(this)
		})

		return this
	}

	addPhaseAfter(phase: Phase, after: Phase | Pipeline): this {
		this.scheduler.insertAfter(phase, after)
		return this
	}

	addPhaseBefore(phase: Phase, before: Phase | Pipeline): this {
		this.scheduler.insertBefore(phase, before)
		return this
	}

	start(): this {
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
	// `query: typeof this.world.query = (...args) => this.world.query(...args)`
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
	query = ((...args: Id[]) => this.world.query(...args)) as typeof this.world.query

	/**
	 * Retrieves the values of up to 4 components on a given entity. Missing
	 * components will return `undefined`.
	 *
	 * Example:
	 * ```ts
	 * const [position, velocity] = app.get(entity, Position, Velocity)
	 * ```
	 */
	get = ((e: Entity, ...args: [Id]) => this.world.get(e, ...args)) as typeof this.world.get

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
	has = ((...args) => this.world.has(...args)) as typeof this.world.has

	/**
	 * Adds a component (with no value) to the entity.
	 *
	 * Example:
	 * ```ts
	 * app.add(entity, IsAlive)
	 * ```
	 */
	add = ((...args) => this.world.add(...args)) as typeof this.world.add

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
	target = ((...args) => this.world.target(...args)) as typeof this.world.target

	/**
	 * Gets the parent (the target of a `ChildOf` relationship) for an entity,
	 * if such a relationship exists.
	 *
	 * Example:
	 * ```ts
	 * const parent = app.parent(child)
	 * ```
	 */
	parent = ((...args) => this.world.parent(...args)) as typeof this.world.parent

	/**
	 * Checks if an entity exists in the this.world.
	 */
	contains = ((...args) => this.world.contains(...args)) as typeof this.world.contains

	/**
	 * Removes a component from the given entity.
	 */
	remove = ((...args) => this.world.remove(...args)) as typeof this.world.remove

	/**
	 * Deletes an entity (and its components/relationships) from the world entirely.
	 */
	delete = ((...args) => this.world.delete(...args)) as typeof this.world.delete

	/**
	 * Clears all components and relationships from the given entity, but
	 * does not delete the entity from the this.world.
	 */
	clear = ((...args) => this.world.clear(...args)) as typeof this.world.clear

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
	each = ((...args) => this.world.each(...args)) as typeof this.world.each

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
	children = ((...args) => this.world.children(...args)) as typeof this.world.children

	/**
	 * Enforces a check for entities to be created within a desired range.
	 *
	 * Example:
	 * ```ts
	 * app.range(0, 100) // Only allow entity IDs between 0 and 100.
	 * ```
	 */
	range = ((...args) => this.world.range(...args)) as typeof this.world.range
}
