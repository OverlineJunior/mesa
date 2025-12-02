import { Phase, Pipeline } from '@rbxts/planck'

// Startup pipeline //

/**
 * The first phase in the startup pipeline, running once before all others, even custom ones.
 *
 * **PRE_STARTUP** -> STARTUP -> POST_STARTUP.
 *
 * ---
 *
 * The startup pipeline runs before the update pipeline.
 */
export const PRE_STARTUP = new Phase('PRE_STARTUP')
/**
 * Runs once on app startup in the following order:
 *
 * PRE_STARTUP -> **STARTUP** -> POST_STARTUP.
 *
 * ---
 *
 * The startup pipeline runs before the update pipeline.
 */
export const STARTUP = new Phase('STARTUP')
/**
 * The last phase in the startup pipeline, running once after all other **startup** phases, even custom ones.
 *
 * PRE_STARTUP -> STARTUP -> **POST_STARTUP**.
 *
 * ---
 *
 * The startup pipeline runs before the update pipeline.
 */
export const POST_STARTUP = new Phase('POST_STARTUP')

// Update pipeline //

/**
 * The first phase in the update pipeline, running on `RunService.Heartbeat` before all other **update** phases, even custom ones.
 *
 * **FIRST** -> PRE_UPDATE -> UPDATE -> POST_UPDATE -> LAST.
 */
export const FIRST = new Phase('FIRST')
/**
 * Runs on `RunService.Heartbeat` in the following order (assuming no custom phases are added):
 *
 * FIRST -> **PRE_UPDATE** -> UPDATE -> POST_UPDATE -> LAST.
 */
export const PRE_UPDATE = new Phase('PRE_UPDATE')
/**
 * Runs on `RunService.Heartbeat` in the following order (assuming no custom phases are added):
 *
 * FIRST -> PRE_UPDATE -> **UPDATE** -> POST_UPDATE -> LAST.
 */
export const UPDATE = new Phase('UPDATE')
/**
 * Runs on `RunService.Heartbeat` in the following order (assuming no custom phases are added):
 *
 * FIRST -> PRE_UPDATE -> UPDATE -> **POST_UPDATE** -> LAST.
 */
export const POST_UPDATE = new Phase('POST_UPDATE')
/**
 * The last phase in the update pipeline, running on `RunService.Heartbeat` after all others, even custom ones.
 *
 * FIRST -> PRE_UPDATE -> UPDATE -> POST_UPDATE -> **LAST**.
 */
export const LAST = new Phase('LAST')

// RunService phases //

/**
 * Runs on `RunService.PreStartup`.
 */
export const PRE_RENDER = new Phase('PRE_RENDER')
/**
 * Runs on `RunService.PreAnimation`.
 */
export const PRE_ANIMATION = new Phase('PRE_ANIMATION')
/**
 * Runs on `RunService.PreSimulation`.
 */
export const PRE_SIMULATION = new Phase('PRE_SIMULATION')
/**
 * Runs on `RunService.PostSimulation`.
 */
export const POST_SIMULATION = new Phase('POST_SIMULATION')

/**
 * ⚠️ Internal phase.
 *
 * Should only be used by the framework itself and third-party plugins that need
 * to run systems absolutely first or last in the update pipeline.
 *
 * **ABSOLUTE_FIRST** -> FIRST -> PRE_UPDATE -> UPDATE -> POST_UPDATE -> LAST -> ABSOLUTE_LAST.
 */
export const ABSOLUTE_FIRST = new Phase('ABSOLUTE_FIRST')
/**
 * ⚠️ Internal phase.
 *
 * Should only be used by the framework itself and third-party plugins that need
 * to run systems absolutely first or last in the update pipeline.
 *
 * ABSOLUTE_FIRST -> FIRST -> PRE_UPDATE -> UPDATE -> POST_UPDATE -> LAST -> **ABSOLUTE_LAST**.
 */
export const ABSOLUTE_LAST = new Phase('ABSOLUTE_LAST')

export const STARTUP_PIPELINE = new Pipeline('STARTUPPipeline').insert(PRE_STARTUP).insert(STARTUP).insert(POST_STARTUP)

export const UPDATE_PIPELINE = new Pipeline('UPDATEPipeline')
	.insert(ABSOLUTE_FIRST)
	.insert(FIRST)
	.insert(PRE_UPDATE)
	.insert(UPDATE)
	.insert(POST_UPDATE)
	.insert(LAST)
	.insert(ABSOLUTE_LAST)
