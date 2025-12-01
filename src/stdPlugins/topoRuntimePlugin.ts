import { App } from '../app'
import { Plugin } from '../plugin'
import { internalPhases } from '../stdPhases'
import { cleanupHookState } from '../topoRuntime'

function topoRuntimeCleanup() {
	cleanupHookState()
}

export class TopoRuntimePlugin implements Plugin {
	build(app: App): void {
		app.addSystems(internalPhases.absoluteLast, topoRuntimeCleanup)
	}
}
