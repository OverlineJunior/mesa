import { FlattenTuple, Nullable, Entity as RawEntity } from '@rbxts/jecs'
import { world } from './world'
import { Component } from './component'
import { Pair } from './pair'
import { UpToFour } from './util'

export type ComponentOrPair<V = unknown> = Component<V>

export type InferValue<T extends ComponentOrPair> =
	T extends Component<infer V> ? V : T extends Pair<infer R> ? R : never

export type InferValues<Ts extends ComponentOrPair[]> = { [K in keyof Ts]: InferValue<Ts[K]> }

export type GetParams<Cs extends ComponentOrPair[]> = {
	[K in keyof Cs]: InferValue<Cs[K]> extends undefined
		? "❌ 'entity.get()' cannot be used with tag components/pairs. Use 'entity.has()' instead."
		: Cs[K]
}

export type GetResult<Cs extends ComponentOrPair[]> = FlattenTuple<Nullable<{ [K in keyof Cs]: InferValue<Cs[K]> }>>

export class Entity {
	constructor(protected readonly id: RawEntity) {}

	set(tagPair: Pair<undefined>): this
	set<V>(pair: Pair<V>, value: V): this
	set(tagComponent: Component<undefined>): this
	set<V>(component: Component<V>, value: V): this
	set(componentOrPair: Entity, value?: unknown) {
		world.set(this.id, (componentOrPair as Entity).id, value)
		return this
	}

	get<Args extends UpToFour<ComponentOrPair>>(...componentsOrPairs: GetParams<Args>): GetResult<Args> {
		return world.get(
			this.id,
			...(componentsOrPairs.map((c) => (c as Entity).id) as UpToFour<RawEntity>),
		) as GetResult<Args>
	}

	has(componentOrPair: ComponentOrPair): boolean {
		return world.has(this.id, (componentOrPair as Entity).id)
	}

	remove(componentOrPair: ComponentOrPair): this {
		world.remove(this.id, (componentOrPair as Entity).id)
		return this
	}

	clear(): this {
		world.clear(this.id)
		return this
	}

	parent(): Entity | undefined {
		const parentId = world.parent(this.id)
		return parentId ? new Entity(parentId) : undefined
	}

	// TODO! Consider performance implications.
	children(): Entity[] {
		const childIds = []
		for (const id of world.children(this.id)) {
			childIds.push(new Entity(id))
		}
		return childIds
	}

	exists(): boolean {
		return world.contains(this.id)
	}

	targetOf(relation: Component, nth = 0): Entity | undefined {
		const t = world.target(this.id, relation.id, nth)
		return t ? new Entity(t) : undefined
	}

	targetsOf(relation: Component): Entity[] {
		const targets: Entity[] = []

		let nth = 0
		while (true) {
			const t = world.target(this.id, relation.id, nth)
			if (!t) {
				break
			}
			targets.push(new Entity(t))
			nth++
		}

		return targets
	}

	// TODO! Find a way to implement this.
	// Example usage:
	// ```ts
	// const Name = component<string>()
	// const Likes = component()
	// const Hates = component()
	// const Loves = component()

	// const alice = entity().set(Name, 'Alice')

	// const bob = entity().set(Name, 'Bob').set(pair(Likes, alice))
	// const charlie = entity().set(Name, 'Charlie').set(pair(Hates, alice))
	// const dave = entity().set(Name, 'Dave').set(pair(Loves, alice))

	// query(pair(Wildcard, alice)).forEach((relatedToAlice) => {
	//     const relations = relatedToAlice.relationsTo(alice)
	// }
	// ```
	relationTo(target: Entity, nth = 0): Component | undefined {
		error('Not implemented')
	}

	// TODO! Same as `relationTo`.
	relationsTo(target: Entity): Component[] {
		error('Not implemented')
	}

	despawn(): void {
		world.delete(this.id)
	}
}

export function entity(): Entity {
	return new Entity(world.entity())
}
