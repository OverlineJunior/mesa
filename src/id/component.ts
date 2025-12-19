import { VALUE_SYMBOL } from '.'
import { world } from '../world'
import { ObservableId } from './observableId'
import { Component as JecsComponent, Wildcard as JecsWildcard, ChildOf as JecsChildOf } from '@rbxts/jecs'

export class Component<Value = unknown> extends ObservableId<Value> {
	declare [VALUE_SYMBOL]: Value
}

export function component<Value = undefined>(): Component<Value> {
	return new Component<Value>(world.component<Value>())
}

export const Wildcard = new Component<unknown>(JecsWildcard)
export const ComponentTag = new Component<undefined>(JecsComponent)
// TODO! Consider making a standard system that removes previous ChildOf
// ! relationships when setting a new one.
export const ChildOf = new Component<undefined>(JecsChildOf)
