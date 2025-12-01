import { useHookState } from '../topoRuntime'
import { useThrottle } from './useThrottle'

// OLD
/**
 * Memoizes a value, updating it at most once every `seconds` seconds.
 * @param seconds The number of seconds between updates.
 * @param factory A factory function to produce the value.
 * @param initialValue An initial value to use until the first update.
 * @param identifier An optional identifier to differentiate between different throttles in the same hook call.
 * @returns The memoized value.
 *
 * @example
 * ```ts
 * // Updates a random value every 0.5 seconds.
 * // When 0.5 seconds have not yet passed, the previous value is returned instead, preventing UI flicker.
 * const value = useThrottledMemo(0.5, () => math.random(), 0)
 * // Draws at 60 FPS, but the value only updates every 0.5 seconds.
 * label.Text = `Value: ${value}`
 * ```
 */

/**
 * Memoizes a value, updating it at most once every `seconds`.
 *
 * Returns the memoized value, which is initialized with `initialValue` and updated by `factory` when the throttle allows.
 *
 * An optional `identifier` can be provided to create separate throttle states for different usages.
 *
 * # Example
 *
 * ```ts
 * function drawRandomValue() {
 *     // Updates a random value every 0.5 seconds.
 *     // When 0.5 seconds have not yet passed, the previous value is returned instead, preventing UI flicker.
 *     const value = useThrottledMemo(0.5, () => math.random(), 0)
 *     // Draws at 60 FPS, but the value only updates every 0.5 seconds.
 *     label.Text = `Value: ${value}`
 * }
 * ```
 */
export function useThrottledMemo<T>(
	seconds: number,
	factory: () => T,
	initialValue: T,
	identifier?: unknown
): T {
	const storage = useHookState({ value: initialValue })

	if (useThrottle(seconds, identifier)) {
		storage.value = factory()
	}

	return storage.value
}
