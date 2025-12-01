import { useHookState } from "../topoRuntime"

/**
 * Throttles execution based on a time interval in seconds.
 *
 * Returns `true` if the specified time interval has passed since the last `true` return,
 * otherwise returns `false`.
 *
 * An optional `identifier` can be provided to create separate throttle states for different usages.
 *
 * # Example
 *
 * ```ts
 * function logNames(world: World) {
 *     for (const [_, name] of world.query(Name)) {
 *         // This log will only occur once per second per unique name.
 *         if (useThrottle(1, name)) {
 * 		    print(`Throttled log: ${name.value}`)
 * 	    }
 *     }
 * }
 * ```
 */
export function useThrottle(seconds: number, identifier?: unknown): boolean {
	const state = useHookState(
		{} as { time?: number; expiry?: number },
		identifier,
		(state) => os.clock() < (state.expiry ?? 0)
	)

	const now = os.clock()

	if (state.time === undefined || now - state.time >= seconds) {
		state.time = now
		state.expiry = now + seconds
		return true
	}

	return false
}
