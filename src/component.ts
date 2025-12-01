import { Entity, component as jecsComponent, Tag } from '@rbxts/jecs'

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
export function component<Value = undefined>(): Value extends undefined ? Tag : Entity<Value> {
	return jecsComponent() as Value extends undefined ? Tag : Entity<Value>
}
