import { Phase } from '@rbxts/planck'
import { World } from './world'
import { App } from './app'
import { Plugin, ResolvedPlugin } from './plugin'

/**
 * The context provided to a system when it is executed.
 *
 * A plugin type parameter may be provided to type the plugin property, assuming
 * the system is registered by a plugin.
 *
 * # Example
 *
 * ```ts
 * function applyGravity({ world, plugin }: SystemContext<GravityPlugin>) {
 *     for (const [e, accel] of world.query(Acceleration)) {
 *         // In order to access plugin properties, the plugin type parameter must be provided.
 *	       accel.y += plugin.gravity
 *     }
 * }
 *
 * class GravityPlugin extends Plugin {
 *     constructor(public gravity: number = -9.81) { }
 *
 *     build(app: App) {
 *         app.addSystems(UPDATE, applyGravity)
 *     }
 * }
 * ```
 */
export interface SystemContext<P extends Plugin | undefined = undefined> {
	world: World
	app: App
	plugin: P
}

/**
 * Systems are functions that operate on entities and components within a world.
 *
 * They receive a `SystemContext` object when executed, which provides access to the
 * _world_, the _app_, and optionally the _plugin_ that registered the system.
 *
 * As an alternative to defining systems as functions that accept a `SystemContext`,
 * one can also define systems as closures typed as `System`.
 *
 * # Example
 *
 * ```ts
 * const greet: System = ({ world }) => {
 *     for (const [_entity, name] of world.query(Name)) {
 *         print(`Hello, ${name.value}!`)
 *     }
 * }
 * ```
 */
export type System = (context: SystemContext<any>) => void | undefined

export class ResolvedSystem {
	readonly fn: System
	readonly phase: Phase
	readonly name: string
	readonly plugin?: ResolvedPlugin

	constructor(system: System, phase: Phase, plugin?: ResolvedPlugin) {
		this.fn = system
		this.phase = phase
		this.name = debug.info(system, 'n')[0]!
		this.plugin = plugin
	}
}
