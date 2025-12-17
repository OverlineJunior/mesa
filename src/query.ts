import { Component } from './component'
import { ComponentOrPair, Entity, InferValues } from './entity'
import { UpToEight } from './util'
import { world } from './world'
import { Entity as RawEntity, Query as RawQuery, World } from '@rbxts/jecs'

export type QueryResult<Cs extends UpToEight<ComponentOrPair> | []> = [Entity, ...InferValues<Cs>]

// We use the Flyweight pattern here to avoid creating a new Entity instance for
// every entity in a query, almost doubling performance.
//
// This does come with the caveat of the user having to `collect` if they want
// to retain references to entities outside of the scope of the query iteration.
class ReusableEntity extends Entity {
	constructor(public id: RawEntity = -1 as RawEntity) {
		super(id)
	}
}

const sharedEntity = new ReusableEntity()

export class Query<Cs extends UpToEight<ComponentOrPair> | []> {
	private readonly isEmpty: boolean
	private readonly rawQuery: RawQuery<RawEntity[]>
	private readonly filters: ((entity: Entity, ...components: InferValues<Cs>) => boolean)[] = []
	private readonly excludedIds: RawEntity[] = []

	constructor(...components: Cs) {
		this.isEmpty = components.size() === 0
		this.rawQuery = world.query(...components.map((c) => (c as Component).id))
	}

	without(...components: Component<unknown>[]): Query<Cs> {
		components.forEach((c) => this.excludedIds.push(c.id))
		return this
	}

	filter(predicate: (entity: Entity, ...components: InferValues<Cs>) => boolean): Query<Cs> {
		this.filters.push(predicate)
		return this
	}

	forEach(callback: (entity: Entity, ...componentValues: InferValues<Cs>) => void): void {
		const fn = callback as unknown as (e: Entity, ...args: unknown[]) => void
		const filters = this.filters as unknown as ((e: Entity, ...args: unknown[]) => boolean)[]
		const hasFilters = filters.size() > 0

		// Roblox-TS won't allow spreading tuples from iterators, so we have to do it manually.
		for (const [e, v1, v2, v3, v4, v5, v6, v7, v8] of this.rawQuery.without(...this.excludedIds)) {
			sharedEntity.id = e

			if (hasFilters && !this.useFilters(sharedEntity, v1, v2, v3, v4, v5, v6, v7, v8)) {
				continue
			}

			fn(sharedEntity, v1, v2, v3, v4, v5, v6, v7, v8)
		}
	}

	map<R extends defined>(mapper: (entity: Entity, ...componentValues: InferValues<Cs>) => R): R[] {
		const results: R[] = []

		this.forEach((e, ...components) => {
			results.push(mapper(e, ...components))
		})

		return results
	}

	reduce<R>(reducer: (accumulator: R, entity: Entity, ...componentValues: InferValues<Cs>) => R, initialValue: R): R {
		let accumulator = initialValue

		this.forEach((e, ...components) => {
			accumulator = reducer(accumulator, e, ...components)
		})

		return accumulator
	}

	// We duplicate a lot of code from `forEach` here so can early exit, resulting in great performance improvements.
	find(predicate: (entity: Entity, ...componentValues: InferValues<Cs>) => boolean): QueryResult<Cs> | undefined {
		const filters = this.filters as unknown as ((e: Entity, ...args: unknown[]) => boolean)[]
		const pred = predicate as unknown as (e: Entity, ...args: unknown[]) => boolean
		const hasFilters = filters.size() > 0

		for (const [e, v1, v2, v3, v4, v5, v6, v7, v8] of this.rawQuery.without(...this.excludedIds)) {
			sharedEntity.id = e

			if (hasFilters && !this.useFilters(sharedEntity, v1, v2, v3, v4, v5, v6, v7, v8)) {
				continue
			}

			if (pred(sharedEntity, v1, v2, v3, v4, v5, v6, v7, v8)) {
				return [
					new Entity((sharedEntity as ReusableEntity).id),
					v1,
					v2,
					v3,
					v4,
					v5,
					v6,
					v7,
					v8,
				] as unknown as QueryResult<Cs>
			}
		}
	}

	collect(): QueryResult<Cs>[] {
		const results: [Entity, ...unknown[]][] = []

		this.forEach((e, ...components) => {
			results.push([new Entity((e as ReusableEntity).id), ...components])
		})

		return results as QueryResult<Cs>[]
	}

	private useFilters(
		e: ReusableEntity,
		v1: unknown,
		v2: unknown,
		v3: unknown,
		v4: unknown,
		v5: unknown,
		v6: unknown,
		v7: unknown,
		v8: unknown,
	): boolean {
		const filters = this.filters as unknown as ((e: Entity, ...args: unknown[]) => boolean)[]

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

export function query<Cs extends UpToEight<ComponentOrPair> | []>(...components: Cs): Query<Cs> {
	return new Query<Cs>(...components)
}
