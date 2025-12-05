<div align="center">
  <img src="assets/mesa.png" width="200" />
  <div style="margin-top: 28;">Mesa, an ECS framework for Roblox-TS to unify them all</div>
</div>

## Testing Workflow

Given `mesa` and a test game `mesa-test`, in order to automatically send changes over, you must first follow the steps below a single time only:

+ On `mesa`, run `npm run build`, then `yalc publish`
+ On `mesa-test`, run `yalc add @rbxts/mesa`, then `npm install`

Then, in order to start testing `mesa` on `mesa-test`, run `npm run watch` on `mesa`.

### Fallback

In case `yalc` fails, the script `packInstall` works as a fallback, packaging `mesa` and installing it on `mesa-test`. Just remember to update it to reference the right test game.
