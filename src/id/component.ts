import { VALUE_SYMBOL } from '.'
import { world } from '../world'
import { ObservableId } from './observableId'
import { Component as JecsComponent, Wildcard as JecsWildcard } from '@rbxts/jecs'

export class Component<Value = unknown> extends ObservableId<Value> {
	declare [VALUE_SYMBOL]: Value
}

export function component<Value = undefined>(): Component<Value> {
	return new Component<Value>(world.component<Value>())
}

export const Wildcard = new Component(JecsWildcard)
export const ComponentTag = new Component(JecsComponent)
