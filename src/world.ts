import { world as newWorld, World, Entity as RawEntity } from '@rbxts/jecs'

type UnsafeWorld = World & {
	entity_index: {
		dense_array: RawEntity[]
		sparse_array: {
			archetype: {
				types: number[]
			}
		}[]
	}
}

export const world = newWorld() as UnsafeWorld
