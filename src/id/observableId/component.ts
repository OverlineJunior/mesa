import { VALUE_SYMBOL } from '..'
import { world } from '../../world'
import { ObservableId } from '.'
import { Component as JecsComponent, Wildcard as JecsWildcard, ChildOf as JecsChildOf } from '@rbxts/jecs'

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
export function component<Value = undefined>(): Component<Value> {
	return new Component<Value>(world.component<Value>())
}

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

/**
 * Built-in _component_ used to distinguish _entities_ that are _components_.
 * Automatically assigned to all _components_ created via the `component` function.
 */
export const ComponentTag = new Component<undefined>(JecsComponent)

// TODO! Consider making a standard system that removes previous ChildOf
// ! relationships when setting a new one.
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
