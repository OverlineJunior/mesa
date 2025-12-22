import { world } from './world'
import {
	pair as jecsPair,
	Entity as JecsEntity,
	Wildcard as JecsWildcard,
	ChildOf as JecsChildOf,
} from '@rbxts/jecs'
import { Flatten, Nullable, OneUpToFour } from './util'

/**
 * The raw Jecs ID type.
 */
export type RawId = JecsEntity

export type IsTag<T extends Id> = T extends Entity
	? true
	: T extends Component<undefined>
		? true
		: T extends Pair<undefined>
			? true
			: false

// We use this as a key to a "phantom property" on Id subclasses to represent
// their value type. With this, we:
// 1. Allow Typescript to infer the value type of Id subclasses with `InferValue`;
// 2. Hide the property from the user.
export declare const VALUE_SYMBOL: unique symbol

export type InferValue<T> = T extends { [VALUE_SYMBOL]: infer V } ? V : never

export type InferValues<Ts> = { [K in keyof Ts]: InferValue<Ts[K]> }

export type RejectTags<Ts extends Id[], Err extends string> = {
	[K in keyof Ts]: IsTag<Ts[K]> extends true ? Err : Ts[K]
}

/**
 * Returns the appropriate handle for `rawId`, or `undefined` if `rawId` does not
 * exist in the world or is invalid (does not reference an _entity_, _component_,
 * _resource_ or _pair_).
 */
export function resolveId(rawId: RawId): Entity | Component | Resource | Pair | undefined {
	if (!world.contains(rawId)) {
		return
	}

	if (world.has(rawId, EntityTag.id)) {
		return new Entity(rawId)
	} else if (world.has(rawId, ComponentTag.id)) {
		return new Component(rawId)
	} else if (world.has(rawId, ResourceTag.id)) {
		return new Resource(rawId)
	} else if (world.has(rawId, PairTag.id)) {
		return new Pair(rawId)
	}

	// Some standard Jecs entities might not have any of the tags above.
	// Those are intentionally ignored in a way that the user doesn't even know
	// about them.
}

// -----------------------------------------------------------------------------
// Id
// -----------------------------------------------------------------------------

export abstract class Id {
	constructor(
		/**
		 * The raw Jecs ID underlying this handle.
		 *
		 * Meant to be used when one cannot use the higher-level abstractions
		 * provided by Toucan, such as storing an _entity_'s raw ID in an
		 * instance's attribute, which cannot hold complex data structures.
		 *
		 * In order to get back the high-level handle from a raw ID, use the
		 * `resolveId` function.
		 */
		public readonly id: RawId,
	) {}

	/**
	 * Assigns a relationship _pair_ to this _id_.
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
	 * Assigns a relationship _pair_ and its _value_ to this _id_.
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
	set<P extends Pair<unknown>>(pair: P, value: InferValue<P>): this
	/**
	 * Assigns a _tag component_ to this _id_.
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
	 * Assigns a _component_ and its _value_ to this _id_.
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
	set(componentOrPair: Id, value?: unknown) {
		if (value === undefined) {
			world.add(this.id, componentOrPair.id)
		} else {
			world.set(this.id, componentOrPair.id, value)
		}

		return this
	}

	// TODO! I'm pretty sure I found a use case for using `Id.get` with tags.
	// ! Reconsider forbidding it after you find that use case again.
	/**
	 * Retrieves the _values_ of up to 4 _components_ or relationship _pairs_ on
	 * this _id_.
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
	get<Args extends OneUpToFour<Component | Pair>>(
		...componentsOrPairs: RejectTags<
			Args,
			"❌ `Id.get()' cannot be used with tag components/pairs. Use 'Id.has()' instead."
		>
	): Flatten<Nullable<InferValues<Args>>> {
		return world.get(this.id, ...(componentsOrPairs.map((c) => c.id) as OneUpToFour<RawId>)) as Flatten<
			Nullable<InferValues<Args>>
		>
	}

	/**
	 * Returns `true` if this _id_ has all of the specified _components_ or
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
	has(...componentsOrPairs: OneUpToFour<Component | Pair>): boolean {
		return world.has(this.id, ...(componentsOrPairs.map((c) => c.id) as OneUpToFour<RawId>))
	}

	/**
	 * Removes a _component_ or relationship _pair_ from this _id_.
	 */
	remove(componentOrPair: Component | Pair): this {
		world.remove(this.id, componentOrPair.id)
		return this
	}

	/**
	 * Clears all _components_ and relationship _pairs_ from this _id_, but
	 * does not delete the _id_.
	 */
	clear(): this {
		world.clear(this.id)
		return this
	}

	/**
	 * Gets the name assigned to this _id_.
	 */
	name(): string {
		return this.get(Name)!
	}

	/**
	 * Gets the parent (the target of a `ChildOf` relationship) for this _id_, if such a relationship exists.
	 *
	 * # Example
	 *
	 * ```ts
	 * const alice = entity()
	 * const charlie = entity().set(pair(ChildOf, alice))
	 *
	 * const parent = charlie.parent() // alice
	 * ```
	 */
	parent(): Id | undefined {
		const parentId = world.parent(this.id)
		return parentId ? resolveId(parentId)! : undefined
	}

	/**
	 * Gets all children (the sources of `ChildOf` relationships) for this _id_.
	 *
	 * # Example
	 *
	 * ```ts
	 * const alice = entity()
	 * const charlie = entity().set(pair(ChildOf, alice))
	 * const bob = entity().set(pair(ChildOf,  alice))
	 *
	 * const children = alice.children() // [charlie, bob]
	 * ```
	 */
	children(): Id[] {
		const childIds = []
		for (const id of world.children(this.id)) {
			childIds.push(resolveId(id)!)
		}
		return childIds
	}

	/**
	 * Returns `true` if this _id_ exists.
	 */
	exists(): boolean {
		return world.contains(this.id)
	}

	/**
	 * Returns the target _id_ of a relationship _pair_ from this _id_.
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
	targetOf(relation: Component, nth = 0): Id | undefined {
		const t = world.target(this.id, relation.id, nth)
		return t ? resolveId(t)! : undefined
	}

	/**
	 * Returns all target _entities_ of a relationship _pair_ from this _id_.
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
	targetsOf(relation: Component): Id[] {
		const targets: Id[] = []
		let nth = 0
		while (true) {
			const t = world.target(this.id, relation.id, nth)
			if (!t) {
				break
			}
			targets.push(resolveId(t)!)
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
	// relationTo(target: Id, nth = 0): Component | undefined {
	// 	error('Not implemented')
	// }

	// TODO! Same as `relationTo`.
	// relationsTo(target: Id): Component[] {
	// 	error('Not implemented')
	// }

	/**
	 * Completely removes this _id_ from the world.
	 */
	despawn(): void {
		world.delete(this.id)
	}
}

// -----------------------------------------------------------------------------
// ObservableId
// -----------------------------------------------------------------------------

export abstract class ObservableId<Value> extends Id {
	/**
	 * Registers a listener that is called whenever this _component_ or _pair_
	 * is added to any _id_.
	 *
	 * The returned function can be called to unregister the listener.
	 */
	added(listener: (id: Id, value: Value) => void): () => void {
		return world.added(this.id, (rawId, _, v) => {
			listener(resolveId(rawId)!, v as Value)
		})
	}

	/**
	 * Registers a listener that is called whenever this _component_ or _pair_
	 * is removed from any _id_ (which might not exist anymore).
	 *
	 * The returned function can be called to unregister the listener.
	 */
	removed(listener: (id: Id | undefined, value: Value) => void): () => void {
		return world.removed(this.id, (rawId) => {
			const v = world.get(rawId, this.id)
			listener(resolveId(rawId), v as Value)
		})
	}

	// TODO! Should also provide the old value.
	/**
	 * Registers a listener that is called whenever the value of this _component_
	 * or _pair_ changes on any _id_.
	 *
	 * The returned function can be called to unregister the listener.
	 */
	changed(listener: (e: Id, newValue: Value) => void): () => void {
		return world.changed(this.id, (rawId, _, newV) => {
			listener(resolveId(rawId)!, newV as Value)
		})
	}
}

// -----------------------------------------------------------------------------
// Entity
// -----------------------------------------------------------------------------

export class Entity extends Id {
	declare protected readonly __brand: 'entity'
}

/**
 * Spawns a new, empty _entity_ and returns it.
 */
export function entity(name?: string): Entity {
	const rawId = world.entity()
	return new Entity(rawId).set(EntityTag).set(Name, name ?? `Entity #${rawId}`)
}

// -----------------------------------------------------------------------------
// Resource
// -----------------------------------------------------------------------------

export class Resource<Value = unknown> extends Id {
	declare [VALUE_SYMBOL]: Value

	/**
	 * Returns the current value of this _resource_.
	 *
	 * Not to be confused with `get`, which can be used to retrieve the value of
	 * _components_ attached to _resources_, just like with _entities_.
	 */
	read(): Value {
		return world.get(this.id, this.id) as Value
	}

	/**
	 * Updates the value of the _resource_.
	 *
	 * Not to be confused with `set`, which can be used to set the value of
	 * _components_ attached to _resources_, just like with _entities_.
	 */
	write(value: Value): this {
		world.set(this.id, this.id, value)
		return this
	}

	/**
	 * Registers a listener that is called whenever the value of this _resource_ changes.
	 *
	 * The returned function can be called to unregister the listener.
	 */
	changed(listener: (newValue: Value) => void): () => void {
		return world.changed(this.id, (_a, _b, v) => {
			listener(v as Value)
		})
	}
}

/**
 * Creates a new _resource_ with the given initial value.
 *
 * Resources exist independently of _entities_ (and cannot be attached to them).
 * They are useful to represent global state, such as game state, settings and so on.
 *
 * # Example
 *
 * ```ts
 * const GameState = resource('lobby')
 *
 * function startGame() {
 *     // `read` and `write` are used instead of `get` and `set` when it comes to
 *     // interacting with the value of a resource.
 *     print(`Game state transitioning from ${GameState.read()} to in-game.`)
 *     GameState.write('in-game')
 * }
 * ```
 */
export function resource<Value extends NonNullable<unknown>>(value: Value, name?: string): Resource<Value> {
	const rawId = world.component<Value>()
	world.set(rawId, rawId, value)

	return new Resource<Value>(rawId).set(ResourceTag).set(Name, name ?? `Resource #${rawId}`)
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export class Component<Value = unknown> extends ObservableId<Value> {
	declare [VALUE_SYMBOL]: Value
}

/**
 * Creates a new _component_.
 *
 * # Example
 *
 * ```ts
 * // A component with a value.
 * const Health = component<number>()
 *
 * // A tag component.
 * const IsAlive = component()
 * ```
 */
export function component<Value = undefined>(name?: string): Component<Value> {
	const rawId = world.component<Value>()
	return new Component<Value>(rawId).set(ComponentTag).set(Name, name ?? `Component #${rawId}`)
}

// -----------------------------------------------------------------------------
// Pair
// -----------------------------------------------------------------------------

export class Pair<Value = unknown> extends ObservableId<Value> {
	declare [VALUE_SYMBOL]: Value
}

/**
 * Creates a relationship _pair_ `relation → target` (e.g.: `Likes → Bob`),
 * where both `relation` and `target` can be either _entities_ or _components_.
 * Pairs can be assigned to any _id_, forming something like `Alice → Likes → Bob`.
 *
 * Like _components_, _pairs_ can hold values. The value type of a _pair_ is
 * determined by its `relation` and `target` arguments:
 *
 * - If `relation` is a _component_ with a value, then the _pair_ takes the same value type;
 * - Else if `target` is a _component_ with a value, then the _pair_ takes the same value type;
 * - Otherwise, the _pair_ is a _tag pair_ and does not hold a value.
 *
 * # Example
 *
 * ```ts
 * const Likes = component()
 * const Owns = component<number>()
 *
 * const car = entity()
 * const bob = entity()
 *     // Because neither `Likes` nor `car` hold values, we have no value to assign.
 *     .set(pair(Likes, car))
 *     // Because `Owns` holds a number value, the pair takes a number value.
 *     .set(pair(Owns, car), 2)
 * ```
 *
 * # Example 2
 *
 * ```ts
 * const Begin = component()
 * const End = component()
 * const Position = component<Vector3>()
 *
 * const line = entity()
 *     // Because `Begin` and `End` hold no values, those pairs take the value from `Position`.
 *     .set(pair(Begin, Position), new Vector3(0, 0, 0))
 *     .set(pair(End, Position), new Vector3(10, 0, 0))
 * ```
 */
export function pair<R, T>(relation: Component<R>, target: Component<T>): Pair<R>
export function pair<R>(relation: Component<R>, target: Entity): Pair<R>
export function pair<T>(relation: Entity, target: Component<T>): Pair<T>
export function pair(relation: Entity, target: Entity): Pair<undefined>
export function pair(relation: Entity | Component, target: Entity | Component) {
	return new Pair(jecsPair(relation.id, target.id) as unknown as RawId)
		.set(PairTag)
		.set(Name, `Pair(${relation.name()}, ${target.name()})`)
}

// -----------------------------------------------------------------------------
// Standard Ids
// -----------------------------------------------------------------------------

// `Name` and `ComponentTag` must be defined first, because `world.component()` needs
// them to properly create components.

/**
 * Built-in _component_ used to assign a name to an _id_.
 *
 * Automatically assigned to all _ids_ created by their respective functions.
 */
export const Name = new Component<string>(world.component())

/**
 * Built-in _component_ used to distinguish _ids_ that are _components_.
 *
 * Automatically assigned to all _components_ created via the `component` function.
 */
export const ComponentTag = new Component<undefined>(world.component())

// Sadly, we have to set these manually based on `world.component()`.

Name.set(ComponentTag)
Name.set(Name, 'Name')

ComponentTag.set(ComponentTag)
ComponentTag.set(Name, 'ComponentTag')

/**
 * Built-in _component_ used to distinguish _ids_ that are _entities_.
 *
 * Automatically assigned to all _entities_ created via the `entity` function.
 */
export const EntityTag = component('EntityTag')

/**
 * Built-in _component_ used to distinguish _ids_ that are _resources_.
 *
 * Automatically assigned to all _resources_ created via the `resource` function.
 */
export const ResourceTag = component('ResourceTag')

/**
 * Built-in _component_ used to distinguish _ids_ that are relationship _pairs_.
 *
 * Automatically assigned to all _pairs_ created via the `pair` function.
 */
export const PairTag = component('PairTag')

// We reuse Jecs' built-in Wildcard component because it uses it internally.
/**
 * Built-in _component__ meant to be used as a wildcard in relationship queries.
 *
 * # Example
 *
 * ```ts
 * // Query all entities that are children of any other entity.
 * query(pair(ChildOf, Wildcard)).forEach((child, parent) => { ... })
 * ```
 */
export const Wildcard = new Component<unknown>(JecsWildcard)
Wildcard.set(ComponentTag)
Wildcard.set(Name, 'Wildcard')

// TODO! Consider making a standard system that removes previous ChildOf
// ! relationships when setting a new one.
// See `Wildcard`.
/**
 * Built-in _component_ used to define parent-child relationships between _entities_.
 *
 * # Example
 *
 * ```ts
 * const alice = entity()
 * const bob = entity().set(pair(ChildOf, alice))
 * ```
 */
export const ChildOf = new Component<undefined>(JecsChildOf)
ChildOf.set(ComponentTag)
ChildOf.set(Name, 'ChildOf')
