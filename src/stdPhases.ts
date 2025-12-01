import { Phase, Pipeline } from '@rbxts/planck'

/**
 * Standard phases provided by the framework for common use-cases.
 *
 * Given an standard, users can create third-party plugins that integrate seamlessly with other users' games.
 */
export const stdPhases = {
	// Startup pipeline.
	/**
	 * The first phase in the startup pipeline, running once before all others, even custom ones.
	 *
	 * **preStartup** -> startup -> postStartup.
	 *
	 * ---
	 *
	 * The startup pipeline runs before the update pipeline.
	 */
	preStartup: new Phase('preStartup'),
	/**
	 * Runs once on app startup in the following order:
	 *
	 * preStartup -> **startup** -> postStartup.
	 *
	 * ---
	 *
	 * The startup pipeline runs before the update pipeline.
	 */
	startup: new Phase('startup'),
	/**
	 * The last phase in the startup pipeline, running once after all other **startup** phases, even custom ones.
	 *
	 * preStartup -> startup -> **postStartup**.
	 *
	 * ---
	 *
	 * The startup pipeline runs before the update pipeline.
	 */
	postStartup: new Phase('postStartup'),

	// Update pipeline.
	/**
	 * The first phase in the update pipeline, running on `RunService.Heartbeat` before all other **update** phases, even custom ones.
	 *
	 * **first** -> preUpdate -> update -> postUpdate -> last.
	 */
	first: new Phase('first'),
	/**
	 * Runs on `RunService.Heartbeat` in the following order (assuming no custom phases are added):
	 *
	 * first -> **preUpdate** -> update -> postUpdate -> last.
	 */
	preUpdate: new Phase('preUpdate'),
	/**
	 * Runs on `RunService.Heartbeat` in the following order (assuming no custom phases are added):
	 *
	 * first -> preUpdate -> **update** -> postUpdate -> last.
	 */
	update: new Phase('update'),
	/**
	 * Runs on `RunService.Heartbeat` in the following order (assuming no custom phases are added):
	 *
	 * first -> preUpdate -> update -> **postUpdate** -> last.
	 */
	postUpdate: new Phase('postUpdate'),
	/**
	 * The last phase in the update pipeline, running on `RunService.Heartbeat` after all others, even custom ones.
	 *
	 * first -> preUpdate -> update -> postUpdate -> **last**.
	 */
	last: new Phase('last'),

	// RunService phases.
	/**
	 * Runs on `RunService.PreStartup`.
	 */
	preRender: new Phase('preRender'),
	/**
	 * Runs on `RunService.PreAnimation`.
	 */
	preAnimation: new Phase('preAnimation'),
	/**
	 * Runs on `RunService.PreSimulation`.
	 */
	preSimulation: new Phase('preSimulation'),
	/**
	 * Runs on `RunService.PostSimulation`.
	 */
	postSimulation: new Phase('postSimulation'),
}

/**
 * Internal phases should only be used by the framework itself and third-party plugins that need
 * to run systems absolutely first or last in the update pipeline.
 */
export const internalPhases = {
	/**
	 * **absoluteFirst** -> first -> preUpdate -> update -> postUpdate -> last -> absoluteLast.
	 */
	absoluteFirst: new Phase('absoluteFirst'),
	/**
	 * absoluteFirst -> first -> preUpdate -> update -> postUpdate -> last -> **absoluteLast**.
	 */
	absoluteLast: new Phase('absoluteLast'),
}

export const stdPipelines = {
	startup: new Pipeline('startupPipeline')
		.insert(stdPhases.preStartup)
		.insert(stdPhases.startup)
		.insert(stdPhases.postStartup),

	update: new Pipeline('updatePipeline')
		.insert(internalPhases.absoluteFirst)
		.insert(stdPhases.first)
		.insert(stdPhases.preUpdate)
		.insert(stdPhases.update)
		.insert(stdPhases.postUpdate)
		.insert(stdPhases.last)
		.insert(internalPhases.absoluteLast),
}
