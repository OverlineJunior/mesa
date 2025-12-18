import { Component } from './component'
import { Entity } from './index'
import { pair as jecsPair, Entity as RawEntity } from '@rbxts/jecs'

export type InferPair<P> = P extends Pair<infer V> ? V : never

export class Pair<Value> extends Component<Value> {
	// Used to distinguish Pair from Entity at the type level.
	//
	// We must declare it as protected, because private gets stripped out for the
	// package consumers, and we don't want it to be public.
	declare protected __brand: Value
}

/**
 * Creates a relationship _pair_ `relation → target` (e.g.: `Likes → Bob`),
 * where both `relation` and `target` can be either _entities_ or _components_.
 * Pairs can be assigned to an _entity_, forming something like `Alice → Likes → Bob`.
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
	return new Pair(jecsPair((relation as Entity)['id'], (target as Entity)['id']) as unknown as RawEntity)
}
