import { Component } from './component'
import { Entity } from './entity'
import { pair as jecsPair, Entity as RawEntity } from '@rbxts/jecs'

export class Pair<R> extends Component<R> {
	// Used to distinguish Pair from Entity at the type level.
	//
	// We must declare it as protected, because private gets stripped out for the
	// package consumers, and we don't want it to be public.
	declare protected __relationshipBrand: R
}

export function pair<R = undefined>(relationship: Component<R>, target: Entity): Pair<R> {
	return new Pair(jecsPair(relationship.id, target['id']) as unknown as RawEntity) as Pair<R>
}
