import { Id } from '.'
import { world } from '../world'
import { Entity as RawId } from '@rbxts/jecs'

export class ObservableId<Value> extends Id {
	added(listener: (e: Id, added: this, value: Value) => void): () => void {
		return world.added(this.id, (rawE, rawComp, v) => {
			listener(new Id(rawE), new ObservableId(rawComp as RawId) as this, v as Value)
		})
	}

	removed(listener: (e: Id, removed: this) => void): () => void {
		return world.removed(this.id, (rawE, rawComp) => {
			listener(new Id(rawE), new ObservableId(rawComp as RawId) as this)
		})
	}

	changed(listener: (e: Id, changed: this, value: Value) => void): () => void {
		return world.changed(this.id, (rawE, rawComp, v) => {
			listener(new Id(rawE), new ObservableId(rawComp as RawId) as this, v as Value)
		})
	}
}
