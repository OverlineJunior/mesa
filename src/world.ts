import { World as Ecs, world as newEcs, Entity, Id, InferComponent, Tag, Pair } from '@rbxts/jecs'

export class World {
	private ecs: Ecs = newEcs()

	/**
	 * Spawns a new, empty entity and returns it.
	 */
	spawn(): Entity
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
		const entity = this.ecs.entity()

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
	set(entity: Entity, id: defined, value?: defined): void {
		if (value === undefined) {
			this.ecs.add(entity, id as Tag)
		} else {
			this.ecs.set(entity, id as Id<unknown>, value)
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
	 * Retrieves the values of up to 4 components on a given entity. Missing
	 * components will return `undefined`.
	 *
	 * # Example
	 *
	 * ```ts
	 * const [position, velocity] = app.get(entity, Position, Velocity)
	 * ```
	 */
	get = ((e: Entity, ...args: [Id]) => this.ecs.get(e, ...args)) as Ecs['get']

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
	 * Deletes an entity (and its components/relationships) from the world entirely.
	 */
	delete = ((...args) => this.ecs.delete(...args)) as Ecs['delete']

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
