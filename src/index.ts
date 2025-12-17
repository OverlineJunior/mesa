export { App } from './app'

export { entity, Entity } from './entity'

export { component, resource, Component, Resource, Wildcard } from './component'

export { pair, Pair } from './pair'

export { query, Query } from './query'

export { System } from './system'

export { Plugin } from './plugin'

export {
	PRE_STARTUP,
	STARTUP,
	POST_STARTUP,
	FIRST,
	PRE_UPDATE,
	UPDATE,
	POST_UPDATE,
	LAST,
	ABSOLUTE_FIRST,
	ABSOLUTE_LAST,
} from './stdPhases'

export { Phase, Pipeline } from '@rbxts/planck'

export { useDeltaTime, useThrottle, useThrottledMemo } from './stdHooks'
export { useHookState } from './topoRuntime'

// Global Jecs re-exports.
// TODO! Items commented out need more thought before being re-exported.
export {
	// pair,
	// pair_first,
	// pair_second,
	// Entity,
	// InferComponent,
	// InferComponents,
	// Component,
	ChildOf,
	// Wildcard,
	// Rest,
	// Exclusive,
	// OnAdd,
	// OnRemove,
	// OnChange,
	// Name,
} from '@rbxts/jecs'
