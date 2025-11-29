import { Phase, Pipeline } from '@rbxts/planck'

export const stdPhases = {
	// Startup pipeline.
	preStartup: new Phase('preStartup'),
	startup: new Phase('startup'),
	postStartup: new Phase('postStartup'),

	// Update pipeline.
	first: new Phase('first'),
	preUpdate: new Phase('preUpdate'),
	update: new Phase('update'),
	postUpdate: new Phase('postUpdate'),
	last: new Phase('last'),

	// RunService phases.
	preRender: new Phase('preRender'),
	preAnimation: new Phase('preAnimation'),
	preSimulation: new Phase('preSimulation'),
	postSimulation: new Phase('postSimulation'),
}

export const stdPipelines = {
	startup: new Pipeline('startupPipeline')
		.insert(stdPhases.preStartup)
		.insert(stdPhases.startup)
		.insert(stdPhases.postStartup),

	update: new Pipeline('updatePipeline')
		.insert(stdPhases.first)
		.insert(stdPhases.preUpdate)
		.insert(stdPhases.update)
		.insert(stdPhases.postUpdate)
		.insert(stdPhases.last),
}
