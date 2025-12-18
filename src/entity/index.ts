import { FlattenTuple, Nullable, Entity as RawEntity } from '@rbxts/jecs'
import { world } from '../world'
import { Component } from './component'
import { InferPair, Pair } from './pair'
import { UpToFour } from '../util'

export type ComponentOrPair<V = unknown> = Component<V>

export type InferValue<T extends ComponentOrPair> =
	T extends Component<infer V> ? V : T extends Pair<infer V> ? V : never

export type InferValues<Ts extends ComponentOrPair[]> = { [K in keyof Ts]: InferValue<Ts[K]> }

export type GetParams<Cs extends ComponentOrPair[]> = {
	[K in keyof Cs]: InferValue<Cs[K]> extends undefined
		? "❌ 'entity.get()' cannot be used with tag components/pairs. Use 'entity.has()' instead."
		: Cs[K]
}

export type GetResult<Cs extends ComponentOrPair[]> = FlattenTuple<Nullable<{ [K in keyof Cs]: InferValue<Cs[K]> }>>

export class Entity {
	constructor(protected readonly id: RawEntity) {}

	/**
	 * Assigns a relationship _pair_ to this _entity_.
	 *
	 * # Example
	 *
	 * ```ts
	 * const Likes = component()
	 *
	 * const bob = entity()
	 * const alice = entity()
	 *     .set(pair(Likes, bob))
	 * ```
	 */
	set(tagPair: Pair<undefined>): this
	/**
	 * Assigns a relationship _pair_ and its _value_ to this _entity_.
	 *
	 * # Example
	 *
	 * ```ts
	 * const Owns = component<number>()
	 *
	 * const car = entity()
	 * const perfume = entity()
	 *
	 * const alice = entity()
	 *     .set(pair(Owns, car), 2)
	 *     .set(pair(Owns, perfume), 5)
	 * ```
	 */
	set<P extends Pair<unknown>>(pair: P, value: InferPair<P>): this
	/**
	 * Assigns a _tag component_ to this _entity_.
	 *
	 * # Example
	 *
	 * ```ts
	 * const IsAlive = component()
	 *
	 * myEntity.set(IsAlive)
	 * ```
	 */
	set(tagComponent: Component<undefined>): this
	/**
	 * Assigns a _component_ and its _value_ to this _entity_.
	 *
	 * # Example
	 *
	 * ```ts
	 * const Health = component<number>()
	 * const Stamina = component<number>()
	 *
	 * entity()
	 *     .set(Health, 100)
	 *     .set(Stamina, 50)
	 * ```
	 */
	set<V>(component: Component<V>, value: NoInfer<V>): this
	set(componentOrPair: Entity, value?: unknown) {
		world.set(this.id, (componentOrPair as Entity).id, value)
		return this
	}

	/**
	 * Retrieves the _values_ of up to 4 _components_ or relationship _pairs_ on
	 * this _entity_.
	 *
	 * Missing _components_ or _pairs_ will return `undefined`.
	 *
	 * # Example
	 *
	 * ```ts
	 * const name = myEntity.get(Name)
	 *
	 * const [position, velocity] = myEntity.get(Position, Velocity)
	 *
	 * const carCount = myEntity.get(pair(Owns, car))
	 * ```
	 */
	get<Args extends UpToFour<ComponentOrPair>>(...componentsOrPairs: GetParams<Args>): GetResult<Args> {
		return world.get(
			this.id,
			...(componentsOrPairs.map((c) => (c as Entity).id) as UpToFour<RawEntity>),
		) as GetResult<Args>
	}

	/**
	 * Returns `true` if this _entity_ has all of the specified _components_ or
	 * relationship _pairs_.
	 *
	 * A maximum of 4 _components_ or _pairs_ can be checked at once.
	 *
	 * # Example
	 *
	 * ```ts
	 * const IsDead = component()
	 * const Owns = component()
	 *
	 * const house = entity()
	 * const bob = entity()
	 *     .set(IsDead)
	 *     .set(pair(Owns, house))
	 *
	 * if (bob.has(IsDead, pair(Owns, house))) {
	 *     // Why don't we rob Bob's house?
	 * }
	 * ```
	 */
	has(...componentsOrPairs: UpToFour<ComponentOrPair>): boolean {
		return world.has(this.id, ...(componentsOrPairs.map((c) => (c as Entity).id) as UpToFour<RawEntity>))
	}

	/**
	 * Removes a _component_ or relationship _pair_ from this _entity_.
	 */
	remove(componentOrPair: ComponentOrPair): this {
		world.remove(this.id, (componentOrPair as Entity).id)
		return this
	}

	/**
	 * Clears all _components_ and relationship _pairs_ from this _entity_, but
	 * does not delete the _entity_.
	 */
	clear(): this {
		world.clear(this.id)
		return this
	}

	// TODO! Add documentation when we define parent/child relationships.
	parent(): Entity | undefined {
		const parentId = world.parent(this.id)
		return parentId ? new Entity(parentId) : undefined
	}

	// TODO! Add documentation when we define parent/child relationships.
	// TODO! Consider performance implications.
	children(): Entity[] {
		const childIds = []
		for (const id of world.children(this.id)) {
			childIds.push(new Entity(id))
		}
		return childIds
	}

	/**
	 * Returns `true` if this _entity_ exists.
	 */
	exists(): boolean {
		return world.contains(this.id)
	}

	/**
	 * Returns the target _entity_ of a relationship _pair_ from this _entity_.
	 *
	 * If there are multiple targets for the given relationship, the `nth` index
	 * can be specified (starting at 0).
	 *
	 * # Example
	 *
	 * ```ts
	 * const Likes = component()
	 *
	 * const bob = entity()
	 * const charlie = entity()
	 * const alice = entity()
	 *     .set(pair(Likes, bob))
	 *     .set(pair(Likes, charlie))
	 *
	 * // The order of targets is not guaranteed.
	 * const maybeBob = alice.targetOf(Likes, 0)
	 * const maybeCharlie = alice.targetOf(Likes, 1)
	 * ```
	 */
	targetOf(relation: Component, nth = 0): Entity | undefined {
		const t = world.target(this.id, relation.id, nth)
		return t ? new Entity(t) : undefined
	}

	/**
	 * Returns all target _entities_ of a relationship _pair_ from this _entity_.
	 *
	 * # Example
	 *
	 * ```ts
	 * const Likes = component()
	 *
	 * const bob = entity()
	 * const charlie = entity()
	 * const alice = entity()
	 *     .set(pair(Likes, bob))
	 *     .set(pair(Likes, charlie))
	 *
	 * const likedEntities = alice.targetsOf(Likes)
	 * ```
	 */
	targetsOf(relation: Component): Entity[] {
		const targets: Entity[] = []

		let nth = 0
		while (true) {
			const t = world.target(this.id, relation.id, nth)
			if (!t) {
				break
			}
			targets.push(new Entity(t))
			nth++
		}

		return targets
	}

	// TODO! Find a way to implement this.
	// Example usage:
	// ```ts
	// const Name = component<string>()
	// const Likes = component()
	// const Hates = component()
	// const Loves = component()

	// const alice = entity().set(Name, 'Alice')

	// const bob = entity().set(Name, 'Bob').set(pair(Likes, alice))
	// const charlie = entity().set(Name, 'Charlie').set(pair(Hates, alice))
	// const dave = entity().set(Name, 'Dave').set(pair(Loves, alice))

	// query(pair(Wildcard, alice)).forEach((relatedToAlice) => {
	//     const relations = relatedToAlice.relationsTo(alice)
	// }
	// ```
	relationTo(target: Entity, nth = 0): Component | undefined {
		error('Not implemented')
	}

	// TODO! Same as `relationTo`.
	relationsTo(target: Entity): Component[] {
		error('Not implemented')
	}

	/**
	 * Completely removes this _entity_ from the world.
	 */
	despawn(): void {
		world.delete(this.id)
	}
}

/**
 * Spawns a new, empty _entity_ and returns it.
 */
export function entity(): Entity {
	return new Entity(world.entity())
}
