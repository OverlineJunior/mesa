import { Component } from './component'
import { Entity } from './entity'
import { ObservableId } from './observableId'
import { RawId, VALUE_SYMBOL } from '.'
import { pair as jecsPair } from '@rbxts/jecs'

export class Pair<Value = unknown> extends ObservableId<Value> {
	declare [VALUE_SYMBOL]: Value
}

export function pair<R, T>(relation: Component<R>, target: Component<T>): Pair<R>
export function pair<R>(relation: Component<R>, target: Entity): Pair<R>
export function pair<T>(relation: Entity, target: Component<T>): Pair<T>
export function pair(relation: Entity, target: Entity): Pair<undefined>
export function pair(relation: Entity | Component, target: Entity | Component) {
	return new Pair(jecsPair((relation as Entity)['id'], target['id']) as unknown as RawId)
}
