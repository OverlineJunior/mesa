import { Id, RawId, InferValues, resolveId, Component, Pair, component, pair } from './id'
import { ZeroUpToEight } from './util'
import { world } from './world'
import { pair as jecsPair } from '@rbxts/jecs'

export type QueryResult<Cs extends (Component | Pair)[]> = [Id, ...InferValues<Cs>]

// TODO! See how we can reintegrate the flyweight pattern, but this time one for each of
// ! entity, component, resource and pair, otherwise queries always return a simple Id object.
// ! Also, note that some doc comments reference a sharedId object that no longer exists.
// ! I kept them because I plan on reintroducing that pattern.

export const Previous = component('Previous')
export const Observed = component('Observed')

export class Query<Cs extends (Component | Pair)[]> {
	private readonly includedIds: RawId[] = []
	private readonly excludedIds: RawId[] = []
	private readonly filters: ((entity: Id, ...components: InferValues<Cs>) => boolean)[] = []
	private observerCallback?: ((id: Id, ...values: unknown[]) => void) = undefined

	constructor(...components: Cs) {
		this.includedIds = components.map((c) => c.id)
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
	filter(predicate: (id: Id, ...components: InferValues<Cs>) => boolean): Query<Cs> {
		this.filters.push(predicate)
		return this
	}

	added<C extends Component>(component: C): Query<[...Cs, C]> {
		const valueIdx = this.includedIds.size()

		const prevPair = jecsPair(Previous.id, component.id)
		this.includedIds.push(component.id)
		this.excludedIds.push(prevPair as unknown as RawId)
		component.set(Observed)

		this.observerCallback = (id, ...values) => {
			const value = values[valueIdx] as defined
			world.set(id.id, prevPair, value)
		}

		return this as unknown as Query<[...Cs, C]>
	}

	removed<C extends Component>(component: C): Query<[...Cs, C]> {
		const prevPair = jecsPair(Previous.id, component.id)
		this.includedIds.push(prevPair as unknown as RawId)
		this.excludedIds.push(component.id)
		component.set(Observed)

		this.observerCallback = (id) => {
			world.remove(id.id, prevPair)
		}

		return this as unknown as Query<[...Cs, C]>
	}

	changed<C extends Component>(component: C): Query<[...Cs, C, C]> {
		// Indices where these values will appear in the arguments list.
		const newIndex = this.includedIds.size()
		const oldIndex = newIndex + 1

		const prevPair = jecsPair(Previous.id, component.id)

		this.includedIds.push(component.id)
		this.includedIds.push(prevPair as unknown as RawId)

		component.set(Observed)

		this.filters.push((_, ...args) => {
			const newVal = args[newIndex]
			const oldVal = args[oldIndex]
			return newVal !== oldVal
		})

		this.observerCallback = (id, ...values) => {
			const newValue = values[newIndex] as defined
			world.set(id.id, prevPair, newValue)
		}

		return this as unknown as Query<[...Cs, C, C]>
	}

	/**
	 * Iterates over each _id_ in the _query_, calling the provided `callback`
	 * with the _id_ and its corresponding _component_ values.
	 */
	forEach(callback: (id: Id, ...componentValues: InferValues<Cs>) => void): void {
		const fn = callback as unknown as (e: Id, ...args: unknown[]) => void
		const filters = this.filters as unknown as ((e: Id, ...args: unknown[]) => boolean)[]
		const hasFilters = filters.size() > 0

		// Empty queries are a special case where we want all entities.
		if (this.includedIds.size() === 0) {
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

		const rawQuery = world.query(...this.includedIds)

		// Roblox-TS won't allow spreading tuples from iterators, so we have to do it manually.
		for (const [rawId, v1, v2, v3, v4, v5, v6, v7, v8] of rawQuery.without(...this.excludedIds)) {
			const id = resolveId(rawId)!

			if (hasFilters && !this.useFilters(id, v1, v2, v3, v4, v5, v6, v7, v8)) {
				continue
			}

			fn(id, v1, v2, v3, v4, v5, v6, v7, v8)

			this.observerCallback?.(id, v1, v2, v3, v4, v5, v6, v7, v8)
		}
	}

	/**
	 * Maps each _id_ in the _query_ to a new value using the provided
	 * `mapper` function, returning an array of the resulting values.
	 *
	 * # Warning
	 *
	 * This method allocates memory for all _ids_ in the _query_ and should be
	 * used sparingly in performance-critical code.
	 */
	map<R extends defined>(mapper: (id: Id, ...componentValues: InferValues<Cs>) => R): R[] {
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
	 * Finds the first _id_ in the _query_ that satisfies the provided
	 * `predicate` function, returning the _id_ and its corresponding
	 * _component_ values, or `undefined` if no such _id_ exists.
	 */
	find(predicate: (id: Id, ...componentValues: InferValues<Cs>) => boolean): QueryResult<Cs> | undefined {
		const filters = this.filters as unknown as ((e: Id, ...args: unknown[]) => boolean)[]
		const pred = predicate as unknown as (e: Id, ...args: unknown[]) => boolean
		const hasFilters = filters.size() > 0

		if (this.includedIds.size() === 0) {
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

		const rawQuery = world.query(...this.includedIds)

		for (const [rawId, v1, v2, v3, v4, v5, v6, v7, v8] of rawQuery.without(...this.excludedIds)) {
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
