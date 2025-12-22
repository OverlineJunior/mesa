import { Id, RawId, InferValues, resolveId, Component, Pair } from './id'
import { ZeroUpToEight } from './util'
import { world } from './world'
import { Query as RawQuery } from '@rbxts/jecs'

export type QueryResult<Cs extends ZeroUpToEight<Component | Pair> | []> = [Id, ...InferValues<Cs>]

// TODO! See how we can reintegrate the flyweight pattern, but this time one for each of
// ! entity, component, resource and pair, otherwise queries always return a simple Id object.
// ! Also, note that some doc comments reference a sharedId object that no longer exists.
// ! I kept them because I plan on reintroducing that pattern.

export class Query<Cs extends ZeroUpToEight<Component | Pair> | []> {
	private readonly isEmpty: boolean
	private readonly rawQuery: RawQuery<RawId[]>
	private readonly filters: ((entity: Id, ...components: InferValues<Cs>) => boolean)[] = []
	private readonly excludedIds: RawId[] = []

	constructor(...components: Cs) {
		this.isEmpty = components.size() === 0
		this.rawQuery = world.query(...components.map((c) => c.id))
	}

	/**
	 * Excludes _entities_ with the specified _components_ from the _query_ results.
	 */
	without(...components: Component[]): Query<Cs> {
		components.forEach((c) => this.excludedIds.push(c.id))
		return this
	}

	/**
	 * Adds a filter predicate to the _query_ that _entities_ must satisfy in order
	 * to be included in the results.
	 */
	filter(predicate: (entity: Id, ...components: InferValues<Cs>) => boolean): Query<Cs> {
		this.filters.push(predicate)
		return this
	}

	/**
	 * Iterates over each _entity_ in the _query_, calling the provided `callback`
	 * with the _entity_ and its corresponding _component_ values.
	 */
	forEach(callback: (entity: Id, ...componentValues: InferValues<Cs>) => void): void {
		const fn = callback as unknown as (e: Id, ...args: unknown[]) => void
		const filters = this.filters as unknown as ((e: Id, ...args: unknown[]) => boolean)[]
		const hasFilters = filters.size() > 0

		// Empty queries are a special case where we want all entities.
		if (this.isEmpty) {
			world.entity_index.dense_array.forEach((rawId) => {
				const id = resolveId(rawId)
				// Since we're iterating over all entities, and Jecs has some
				// standard entities Toucan doesn't support, we need to skip those.
				if (!id) {
					return
				}

				if (hasFilters && !this.useFilters(id)) {
					return
				}

				fn(id)
			})

			return
		}

		// Roblox-TS won't allow spreading tuples from iterators, so we have to do it manually.
		for (const [rawId, v1, v2, v3, v4, v5, v6, v7, v8] of this.rawQuery.without(...this.excludedIds)) {
			const id = resolveId(rawId)!

			if (hasFilters && !this.useFilters(id, v1, v2, v3, v4, v5, v6, v7, v8)) {
				continue
			}

			fn(id, v1, v2, v3, v4, v5, v6, v7, v8)
		}
	}

	/**
	 * Maps each _entity_ in the _query_ to a new value using the provided
	 * `mapper` function, returning an array of the resulting values.
	 *
	 * # Warning
	 *
	 * This method allocates memory for all _entities_ in the _query_ and should be
	 * used sparingly in performance-critical code.
	 */
	map<R extends defined>(mapper: (entity: Id, ...componentValues: InferValues<Cs>) => R): R[] {
		const results: R[] = []

		this.forEach((e, ...components) => {
			results.push(mapper(e, ...components))
		})

		return results
	}

	/**
	 * Reduces the _entities_ in the _query_ to a single value using the provided
	 * `reducer` function and `initialValue`.
	 */
	reduce<R>(reducer: (accumulator: R, entity: Id, ...componentValues: InferValues<Cs>) => R, initialValue: R): R {
		let accumulator = initialValue

		this.forEach((e, ...components) => {
			accumulator = reducer(accumulator, e, ...components)
		})

		return accumulator
	}

	// We duplicate a lot of code from `forEach` here so can early exit, resulting in great performance improvements.
	/**
	 * Finds the first _entity_ in the _query_ that satisfies the provided
	 * `predicate` function, returning the _entity_ and its corresponding
	 * _component_ values, or `undefined` if no such _entity_ exists.
	 */
	find(predicate: (entity: Id, ...componentValues: InferValues<Cs>) => boolean): QueryResult<Cs> | undefined {
		const filters = this.filters as unknown as ((e: Id, ...args: unknown[]) => boolean)[]
		const pred = predicate as unknown as (e: Id, ...args: unknown[]) => boolean
		const hasFilters = filters.size() > 0

		if (this.isEmpty) {
			world.entity_index.dense_array.forEach((rawId) => {
				const id = resolveId(rawId)
				// Same as in `forEach`, we need to skip unsupported standard entities.
				if (!id) {
					return
				}

				if (hasFilters && !this.useFilters(id)) {
					return
				}

				if (pred(id)) {
					return [id] as unknown as QueryResult<Cs>
				}
			})

			return undefined
		}

		for (const [rawId, v1, v2, v3, v4, v5, v6, v7, v8] of this.rawQuery.without(...this.excludedIds)) {
			const id = resolveId(rawId)!

			if (hasFilters && !this.useFilters(id, v1, v2, v3, v4, v5, v6, v7, v8)) {
				continue
			}

			if (pred(id, v1, v2, v3, v4, v5, v6, v7, v8)) {
				return [id, v1, v2, v3, v4, v5, v6, v7, v8] as unknown as QueryResult<Cs>
			}
		}
	}

	/**
	 * Collects all _entities_ in the _query_, returning an array of the _entities_
	 * and their corresponding _component_ values.
	 *
	 * # Warning
	 *
	 * This method allocates memory for all _entities_ in the _query_ and should be
	 * used sparingly in performance-critical code.
	 */
	collect(): QueryResult<Cs>[] {
		const results: [Id, ...unknown[]][] = []

		this.forEach((e, ...components) => {
			results.push([resolveId(e.id)!, ...components])
		})

		return results as QueryResult<Cs>[]
	}

	private useFilters(
		e: Id,
		v1?: unknown,
		v2?: unknown,
		v3?: unknown,
		v4?: unknown,
		v5?: unknown,
		v6?: unknown,
		v7?: unknown,
		v8?: unknown,
	): boolean {
		const filters = this.filters as unknown as ((e: Id, ...args: unknown[]) => boolean)[]

		let passed = true
		for (const filter of filters) {
			if (!filter(e, v1, v2, v3, v4, v5, v6, v7, v8)) {
				passed = false
				break
			}
		}

		return passed
	}
}

/**
 * Creates a new _query_ for _entities_ that have all of the specified
 * _components_ or relationship _pairs_.
 *
 * Special cases:
 * - Queries with no _components_ will match all _entities_;
 * - The `Wildcard` standard component can be used in queries with relationship
 * _pairs_ to match any `relation` or `target`.
 *
 * # Example
 *
 * ```ts
 * // Query for entities with Position and Velocity components.
 * const Position = component<Vector3>()
 * const Velocity = component<Vector3>()
 * query(Position, Velocity).forEach((entity, pos, vel) => { ... })
 *
 * // Query for all entities.
 * query().forEach((entity) => { ... })
 *
 * // Query for entities that like `car`.
 * const Likes = component()
 * const car = entity()
 * query(pair(Likes, car)).forEach((entity) => { ... })
 *
 * // Query for entities that like anything.
 * query(pair(Likes, Wildcard)).forEach((entity) => { ... })
 * ```
 */
export function query<Cs extends ZeroUpToEight<Component | Pair>>(...components: Cs): Query<Cs> {
	return new Query<Cs>(...components)
}
