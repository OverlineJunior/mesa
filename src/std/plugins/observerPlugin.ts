import { App } from '../../app'
import { Component, Pair, pair } from '../../id'
import { Observed, Previous, query } from '../../query'
import { ABSOLUTE_LAST } from '../phases'

function foo() {
	query(Observed).forEach((_id) => {
		const comp = _id as Component
		const prevPair = pair(Previous, comp) as Pair<unknown>

		// Added.
		query(comp)
			.without(prevPair)
			.forEach((id, value) => {
				id.set(prevPair, value)
			})

		// Removed.
		query(prevPair)
			.without(comp)
			.forEach((id) => {
				id.remove(prevPair)
			})

		// Changed.
		query(comp, prevPair)
			.filter((_, newV, oldV) => newV !== oldV)
			.forEach((id, newValue) => {
				id.set(prevPair, newValue)
			})
	})
}

export class ObserverPlugin {
	build(app: App) {
		app.addSystems(ABSOLUTE_LAST, [foo])
	}
}
