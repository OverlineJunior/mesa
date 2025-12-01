import { Phase } from '@rbxts/planck'

export type SystemFn = (...args: any[]) => void | undefined

export class System {
	readonly fn: SystemFn
	readonly phase: Phase
	readonly name: string

	constructor(systemFn: SystemFn, phase: Phase) {
		this.fn = systemFn
		this.phase = phase
		this.name = debug.info(systemFn, 'n')[0]!
	}
}
