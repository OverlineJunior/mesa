import { world } from '../world'
import { FlattenTuple, Nullable, Entity as JecsEntity } from '@rbxts/jecs'
import { component, Component } from './component'
import { Pair } from './pair'
import { OneUpToFour } from '../util'
import { entity, Entity } from './entity'

export type RawId = JecsEntity

export type IsTag<T extends Id> = T extends Entity
	? true
	: T extends Component<undefined>
		? true
		: T extends Pair<undefined>
			? true
			: false

// We use this as a key to a "phantom property" on Id subclasses to represent
// their value type. With this, we:
// 1. Allow Typescript to infer the value type of Id subclasses with `InferValue`;
// 2. Hide the property from the user.
export declare const VALUE_SYMBOL: unique symbol

export type InferValue<T> = T extends { [VALUE_SYMBOL]: infer V } ? V : never

export type InferValues<Ts> = { [K in keyof Ts]: InferValue<Ts[K]> }

export type RejectTags<Ts extends Id[], Err extends string> = {
	[K in keyof Ts]: IsTag<Ts[K]> extends true ? Err : Ts[K]
}

export class Id {
	constructor(protected readonly id: RawId) {}

	set(tagPair: Pair<undefined>): this
	set<P extends Pair<unknown>>(pair: P, value: InferValue<P>): this
	set(tagComponent: Component<undefined>): this
	set<V>(component: Component<V>, value: NoInfer<V>): this
	set(componentOrPair: Id, value?: unknown) {
		world.set(this.id, componentOrPair.id, value)
		return this
	}

	get<Args extends OneUpToFour<Component | Pair>>(
		...componentsOrPairs: RejectTags<
			Args,
			"❌ 'entity.get()' cannot be used with tag components/pairs. Use 'entity.has()' instead."
		>
	): FlattenTuple<Nullable<InferValues<Args>>> {
		return world.get(this.id, ...(componentsOrPairs.map((c) => c['id']) as OneUpToFour<RawId>)) as FlattenTuple<
			Nullable<InferValues<Args>>
		>
	}

	has(...componentsOrPairs: OneUpToFour<Component | Pair>): boolean {
		return world.has(this.id, ...(componentsOrPairs.map((c) => c['id']) as OneUpToFour<RawId>))
	}

	remove(componentOrPair: Component | Pair): this {
		world.remove(this.id, componentOrPair['id'])
		return this
	}

	clear(): this {
		world.clear(this.id)
		return this
	}

	parent(): Id | undefined {
		const parentId = world.parent(this.id)
		return parentId ? new Id(parentId) : undefined
	}

	children(): Id[] {
		const childIds = []
		for (const id of world.children(this.id)) {
			childIds.push(new Id(id))
		}
		return childIds
	}

	exists(): boolean {
		return world.contains(this.id)
	}

	targetOf(relation: Component, nth = 0): Id | undefined {
		const t = world.target(this.id, relation.id, nth)
		return t ? new Id(t) : undefined
	}

	targetsOf(relation: Component): Id[] {
		const targets: Id[] = []
		let nth = 0
		while (true) {
			const t = world.target(this.id, relation.id, nth)
			if (!t) {
				break
			}
			targets.push(new Id(t))
			nth++
		}

		return targets
	}

	relationTo(target: Id, nth = 0): Component | undefined {
		error('Not implemented')
	}

	relationsTo(target: Id): Component[] {
		error('Not implemented')
	}

	despawn(): void {
		world.delete(this.id)
	}
}

const Name = component<string>()
const bob = entity().set(Name, 'Bob')
const name = bob.get(Name)
