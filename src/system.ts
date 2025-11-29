import { Phase } from '@rbxts/planck'

export type SystemFn = (...args: any[]) => void | undefined

export interface System {
	fn: SystemFn
	phase: Phase
	name: string
}

export function system(systemFn: SystemFn, phase: Phase): System {
	return { fn: systemFn, phase, name: debug.info(systemFn, 'n')[0]! }
}

function isSystem(thing: unknown): thing is System {
	return typeIs(thing, 'table') && 'fn' in thing! && 'phase' in thing
}

export function findSystems(sources: Instance[]): System[] {
	const systems: System[] = []

	sources.forEach((src) => {
		src.GetDescendants().forEach((mod) => {
			if (!mod.IsA('ModuleScript')) return

			const s = require(mod)
			if (!typeIs(s, 'table')) return

			if ('default' in s && isSystem(s.default)) {
				systems.push(s.default)
			}
		})
	})

	return systems
}
