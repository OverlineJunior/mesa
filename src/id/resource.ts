import { Id, VALUE_SYMBOL } from '.'
import { world } from '../world'

export class Resource<Value extends NonNullable<unknown>> extends Id {
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
export function resource<Value extends NonNullable<unknown>>(value: Value): Resource<Value> {
	const id = world.component<Value>()
	world.set(id, id, value)

	return new Resource<Value>(id)
}
