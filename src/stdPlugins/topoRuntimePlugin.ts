import { App } from '../app'
import { Plugin } from '../plugin'
import { ABSOLUTE_LAST } from '../stdPhases'
import { cleanupHookState } from '../topoRuntime'

function topoRuntimeCleanup() {
	cleanupHookState()
}

export class TopoRuntimePlugin implements Plugin {
	build(app: App): void {
		app.addSystems(ABSOLUTE_LAST, topoRuntimeCleanup)
	}
}
