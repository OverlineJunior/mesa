import { App } from './app'

export interface Plugin {
	build(app: App): void
}

export function isPlugin(thing: unknown): thing is Plugin {
	return typeIs(thing, 'table') && typeIs((thing as Plugin).build, 'function')
}
