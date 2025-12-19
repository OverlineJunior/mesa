import { Phase } from '@rbxts/planck'
import { App } from './app'
import { Plugin, ResolvedPlugin } from './plugin'

/**
 * Systems are functions scheduled to run on specific _phases_. They usually
 * operate on _entities_ queried by their _components_.
 *
 * Every _system_ receives the running `app` instance as its first parameter,
 * and an optional `plugin` instance as its second parameter, assuming the _system_
 * was registered by a _plugin_.
 *
 * # Example
 *
 * ```ts
 * function applyGravity(app: App, plugin: GravityPlugin) {
 *     query(Velocity).forEach((entity, velocity) => {
 *         entity.set(Velocity, new Vector3(
 *             velocity.X,
 *             velocity.Y + plugin.gravity * useDeltaTime(),
 *             velocity.Z,
 *         ))
 *     })
 * }
 *
 * class GravityPlugin implements Plugin {
 *     constructor(public gravity = -9.81) { }
 *
 *     build(app: App) {
 *         app.addSystems(UPDATE, applyGravity)
 *     }
 * }
 * ```
 */
export type System<P extends Plugin> = (app: App, plugin?: P) => void | undefined

export class ResolvedSystem<P extends Plugin = Plugin> {
	readonly fn: System<P>
	readonly phase: Phase
	readonly name: string
	readonly plugin?: ResolvedPlugin

	constructor(system: System<P>, phase: Phase, plugin?: ResolvedPlugin) {
		this.fn = system
		this.phase = phase
		this.name = debug.info(system, 'n')[0]!
		this.plugin = plugin
	}
}
