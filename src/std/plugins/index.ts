import { ObserverPlugin } from './observerPlugin'
import { TopoRuntimePlugin } from './topoRuntimePlugin'

export const stdPlugins = [new TopoRuntimePlugin(), new ObserverPlugin()]
