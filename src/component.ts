import { ComponentOrPair, Entity, GetParams, GetResult } from './entity'
import { Entity as RawEntity, Wildcard as RawWildcard } from '@rbxts/jecs'
import { world } from './world'
import { Pair } from './pair'
import { UpToFour } from './util'

export class Component<Value = undefined> extends Entity {
	constructor(override readonly id: RawEntity<Value>) {
		super(id)
	}

	added(listener: (e: Entity, id: Component<Value>, value: Value) => void): () => void {
		return world.added(this.id, (rawE, rawComp, v) => {
			listener(new Entity(rawE), new Component(rawComp as RawEntity<Value>), v)
		})
	}

	removed(listener: (e: Entity, id: Component<Value>) => void): () => void {
		return world.removed(this.id, (rawE, rawComp) => {
			listener(new Entity(rawE), new Component(rawComp as RawEntity<Value>))
		})
	}

	changed(listener: (e: Entity, id: Component<Value>, value: Value) => void): () => void {
		return world.changed(this.id, (rawE, rawComp, v) => {
			listener(new Entity(rawE), new Component(rawComp as RawEntity<Value>), v)
		})
	}
}

export function component<Value = undefined>(): Component<Value> {
	return new Component<Value>(world.component<Value>())
}

export const Wildcard = new Component<unknown>(RawWildcard)

export class Resource<Value> extends Entity {
	set(value: Value): this
	set(pair: Pair<undefined>): this
	set<V>(pair: Pair<V>, value: V): this
	set(tagComponent: Component<undefined>): this
	set<V>(component: Component<V>, value: V): this
	set(componentOrValue: ComponentOrPair | Value, value?: unknown): this {
		if (componentOrValue instanceof Component) {
			super.set(componentOrValue, value)
		} else {
			world.set(this.id, this.id, componentOrValue)
		}

		return this
	}

	get(): Value
	get<Cs extends UpToFour<Component<unknown>>>(...components: GetParams<Cs>): GetResult<Cs>
	get(...components: Component<unknown>[]) {
		if (components.size() === 0) {
			return world.get(this.id, this.id)
		} else {
			return super.get(...(components as [Component<unknown>]))
		}
	}
}

export function resource<Value>(value: Value): Resource<Value> {
	const id = world.component<Value>()
	world.set(id, id, value)

	return new Resource<Value>(id)
}
