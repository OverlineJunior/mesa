import {
	World as Ecs,
	world as newEcs,
	Entity,
	Id,
	InferComponent,
	Tag,
	Pair,
	InferComponents,
} from '@rbxts/jecs'

type FlattenTuple<T extends unknown[]> = T extends [infer U] ? U : LuaTuple<T>

type Nullable<T extends unknown[]> = { [K in keyof T]: T[K] | undefined }

type RejectTags<T, Err> = T extends Tag ? Err : T

type SpawnArgumentShape = [Entity<any>, any] | [Tag]

type SpawnComponentDefinition<T> =
	// Handle `[Component, Value]`.
	T extends [infer C, infer V]
		? C extends Entity
			? // Ensure the value matches the component's type.
				V extends InferComponent<C>
				? T
				: [C, InferComponent<C>]
			: never
		: // Handle `[ComponentTag]`.
			T extends [infer C]
			? C extends Tag
				? T
				: never
			: never

function isArray<T = unknown>(value: unknown): value is T[] {
	return typeIs(value, 'table') && 1 in value
}

/**
 * Stores and exposes operations on _entities_ and _components_.
 */
export class World {
	private ecs: Ecs = newEcs()

	/**
	 * Spawns a new, empty entity and returns it.
	 */
	spawn(): Entity
	/**
	 * Spawns a new entity with a single tag component, and returns it.
	 *
	 * # Example
	 *
	 * ```ts
	 * const entity = app.spawn(IsAlive)
	 * ```
	 */
	spawn(component: Tag): Entity
	/**
	 * Spawns a new entity with a single component and value, and returns it.
	 *
	 * # Example
	 *
	 * ```ts
	 * const entity = app.spawn(Name, 'Bob')
	 * ```
	 */
	spawn<V>(component: Entity<V>, value: V): Entity
	/**
	 * Spawns a new entity with multiple components and values, and returns it.
	 *
	 * # Example
	 *
	 * ```ts
	 * const entity = app.spawn(
	 *     [Health, 100],
	 *     [Position, new Vector3(0, 10, 0)],
	 *     [Velocity, new Vector3(1, 0, 0)],
	 * )
	 * ```
	 */
	spawn<Arg extends SpawnArgumentShape[]>(...args: { [K in keyof Arg]: SpawnComponentDefinition<Arg[K]> }): Entity
	spawn(...args: defined[]): Entity {
		// Possible shapes of `args`:
		// - Shape 1: []
		// - Shape 2: [Tag]
		// - Shape 3: [Entity, Value]
		// - Shape 4: [[Entity, Value], [Tag], [Entity, Value], ...]

		const entity = this.ecs.entity()

		// Shape 1.
		if (args.size() === 0) {
			return entity
		}

		// Shape 4.
		if (isArray(args[0])) {
			args.forEach((pair) => {
				const [first, second] = pair as [Id, defined?]
				this.set(entity, first, second)
			})

			return entity
		}

		// Shape 2 & 3.
		const [first, second] = args as [Id, defined?]
		this.set(entity, first, second)

		return entity
	}

	/**
	 * Despawns an entity (and its components/relationships) from the world entirely.
	 */
	despawn = ((...args) => this.ecs.delete(...args)) as Ecs['delete']

	/**
	 * Retrieves the values of up to 4 components on a given entity. Missing
	 * components will return `undefined`.
	 *
	 * # Example
	 *
	 * ```ts
	 * const [position, velocity] = world.get(entity, Position, Velocity)
	 * ```
	 */
	get<T extends [Id] | [Id, Id] | [Id, Id, Id] | [Id, Id, Id, Id]>(
		entity: Entity,
		...components: {
			[K in keyof T]: RejectTags<T[K], "❌ 'world.get()' cannot be used with Tags. Use 'world.has()' instead.">
		}
	): FlattenTuple<Nullable<InferComponents<T>>>
	/**
	 * Retrieves the value of a resource.
	 *
	 * # Example
	 *
	 * ```ts
	 * const IsMatchRunning = resource(true)
	 *
	 * const isRunning = world.get(IsMatchRunning) // `true`.
	 * ```
	 */
	get<V extends defined>(resource: Entity<V>): V
	get(entOrRes: Entity, ...components: Id[]): unknown {
		if (components.size() === 0) {
			// Resource overload.
			return this.ecs.get(entOrRes, entOrRes)
		} else {
			// Component overload.
			return this.ecs.get(entOrRes, ...(components as [Id]))
		}
	}

	/**
	 * Assigns a value to a component on the given entity.
	 *
	 * # Example
	 *
	 * ```ts
	 * app.set(entity, Health, 100)
	 * ```
	 */
	set<Comp extends Id<unknown>>(entity: Entity, component: Comp, value: InferComponent<Comp>): void
	/**
	 * Assigns a tag component on the given entity.
	 *
	 * # Example
	 *
	 * ```ts
	 * app.set(entity, IsAlive)
	 * ```
	 *
	 * ---
	 *
	 * # Setting relationships
	 *
	 * Additionally, one can also set relationship pairs:
	 *
	 * ```ts
	 * app.set(bob, pair(ChildOf, alice))
	 * ```
	 */
	set(entity: Entity, tagOrPair: Tag | Pair): void
	/**
	 * Sets the value of a resource.
	 *
	 * # Example
	 *
	 * ```ts
	 * const GameState = resource('lobby')
	 *
	 * world.set(GameState, 'in-game')
	 * ```
	 */
	set<V>(resource: Entity<V>, value: V): void
	set(entOrRes: Entity, compOrValue: defined, value?: defined): void {
		if (this.get(entOrRes, entOrRes)) {
			print('Set resource')
			this.ecs.set(entOrRes, entOrRes, compOrValue)
		}

		if (value === undefined) {
			this.ecs.add(entOrRes, compOrValue as Tag)
		} else {
			this.ecs.set(entOrRes, compOrValue as Id<unknown>, value)
		}
	}

	// -------------------------------------------------------------------------
	// Jecs' world re-exports.
	// -------------------------------------------------------------------------

	// For some unknown reason, when re-exporting as methods, something like
	// `query: Ecs['query'] = (...args) => this.ecs.query(...args)`
	// causes completely different results. We use this workaround in other places.
	/**
	 * Searches the world for entities that match specified components.
	 *
	 * # Example
	 *
	 * ```ts
	 * for (const [entity, position, velocity] of app.query(Position, Velocity)) {
	 *     // ...
	 * }
	 */
	query = ((...args: Id[]) => this.ecs.query(...args)) as Ecs['query']

	/**
	 * Returns `true` if the given entity has all of the specified components.
	 * A maximum of 4 components can be checked at once.
	 *
	 * # Example
	 *
	 * ```ts
	 * if (app.has(entity, Position, Velocity)) {
	 *     // ...
	 * }
	 * ```
	 */
	has = ((...args) => this.ecs.has(...args)) as Ecs['has']

	/**
	 * Gets the target of a relationship.
	 * @param entity The entity using a relationship pair.
	 * @param relation The "relationship" component/tag (e.g., ChildOf).
	 * @param index If multiple targets exist, specify an index. Defaults to 0.
	 *
	 * # Example
	 *
	 * ```ts
	 * const parent = app.target(child, ChildOf) // Get the parent of `child`.
	 * ```
	 */
	target = ((...args) => this.ecs.target(...args)) as Ecs['target']

	/**
	 * Gets the parent (the target of a `ChildOf` relationship) for an entity,
	 * if such a relationship exists.
	 *
	 * # Example
	 *
	 * ```ts
	 * const parent = app.parent(child)
	 * ```
	 */
	parent = ((...args) => this.ecs.parent(...args)) as Ecs['parent']

	/**
	 * Checks if an entity exists in the this.ecs.
	 */
	contains = ((...args) => this.ecs.contains(...args)) as Ecs['contains']

	/**
	 * Removes a component from the given entity.
	 */
	remove = ((...args) => this.ecs.remove(...args)) as Ecs['remove']

	/**
	 * Clears all components and relationships from the given entity, but
	 * does not delete the entity from the world.
	 */
	clear = ((...args) => this.ecs.clear(...args)) as Ecs['clear']

	/**
	 * Returns an iterator that yields all entities that have the specified component or relationship.
	 *
	 * # Example
	 *
	 * ```ts
	 * for (const entity of app.each(Health)) {
	 *     // ...
	 * }
	 * ```
	 */
	each = ((...args) => this.ecs.each(...args)) as Ecs['each']

	/**
	 * Returns an iterator that yields all child entities of the specified parent entity.
	 * Uses the ChildOf relationship internally.
	 *
	 * # Example
	 *
	 * ```ts
	 * for (const child of app.children(parent)) {
	 *     // ...
	 * }
	 * ```
	 */
	children = ((...args) => this.ecs.children(...args)) as Ecs['children']

	/**
	 * Enforces a check for entities to be created within a desired range.
	 *
	 * # Example
	 *
	 * ```ts
	 * // Only allow entity IDs between 0 and 100.
	 * app.range(0, 100)
	 * ```
	 */
	range = ((...args) => this.ecs.range(...args)) as Ecs['range']
}
